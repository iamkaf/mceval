import { randomUUID } from "node:crypto";

import { evaluatedModels } from "@/data/models";
import { hashJson } from "./cloud-runs";
import { runD1, type D1DatabaseLike } from "./types";

export type SuiteSummary = {
  id: string;
  suiteKey: string;
  name: string;
  description: string | null;
  publishedVersionId: string | null;
  publishedVersionName: string | null;
  readyCount: number;
  draftCount: number;
};

export type SuiteVersionSummary = {
  id: string;
  suiteId: string;
  suiteKey: string;
  suiteName: string;
  humanName: string;
  status: "ready" | "published" | "archived";
  sampleCount: number;
  suiteHash: string;
  createdAt: string;
  publishedAt: string | null;
};

export type SuiteDraftSummary = {
  id: string;
  suiteId: string;
  suiteKey: string;
  suiteName: string;
  humanName: string;
  status: "draft" | "archived";
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SuiteDraftDetail = SuiteDraftSummary & {
  samples: DraftSampleSummary[];
};

export type DraftSampleSummary = {
  id: string;
  stableId: string;
  input: string;
  target: string;
  acceptedTargets: string[];
  tags: string[];
  category: string;
  difficulty: string;
  rationale: string | null;
  position: number;
};

export type PublishedSuiteSample = {
  suiteKey: string;
  suiteName: string;
  versionName: string;
  stableId: string;
  input: string;
  target: string;
  category: string;
  difficulty: string;
};

export type DraftSampleInput = {
  stableId: string;
  input: string;
  target: string;
  acceptedTargets?: string[];
  tags?: string[];
  category: string;
  difficulty: string;
  rationale?: string;
  position?: number;
};

type SuiteRow = {
  id: string;
  suite_key: string;
  name: string;
  description: string | null;
  published_version_id: string | null;
  published_version_name: string | null;
  ready_count: number;
  draft_count: number;
};

type DraftRow = {
  id: string;
  suite_id: string;
  suite_key: string;
  suite_name: string;
  human_name: string;
  status: "draft" | "archived";
  sample_count: number;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  id: string;
  suite_id: string;
  suite_key: string;
  suite_name: string;
  human_name: string;
  status: "ready" | "published" | "archived";
  sample_count: number;
  suite_hash: string;
  created_at: string;
  published_at: string | null;
};

type DraftSampleRow = {
  id: string;
  stable_id: string;
  input: string;
  target: string;
  choices_json: string | null;
  metadata_json: string | null;
  category: string;
  difficulty: string;
  position: number;
};

export async function listSuiteSummaries(db: D1DatabaseLike): Promise<SuiteSummary[]> {
  const { results = [] } = await db
    .prepare(`
      SELECT s.id, s.suite_key, s.name, s.description,
             published.id AS published_version_id,
             published.human_name AS published_version_name,
             COUNT(DISTINCT ready.id) AS ready_count,
             COUNT(DISTINCT draft.id) AS draft_count
      FROM suites s
      LEFT JOIN suite_versions published ON published.suite_id = s.id AND published.status = 'published'
      LEFT JOIN suite_versions ready ON ready.suite_id = s.id AND ready.status = 'ready'
      LEFT JOIN suite_drafts draft ON draft.suite_id = s.id AND draft.status = 'draft'
      WHERE s.status = 'active'
      GROUP BY s.id, s.suite_key, s.name, s.description, published.id, published.human_name
      ORDER BY CASE s.suite_key
        WHEN 'knowledge' THEN 1
        WHEN 'code' THEN 2
        WHEN 'platforms' THEN 3
        WHEN 'ecosystem' THEN 4
        ELSE 5
      END
    `)
    .all<SuiteRow>();

  return results.map((row) => ({
    id: row.id,
    suiteKey: row.suite_key,
    name: row.name,
    description: row.description,
    publishedVersionId: row.published_version_id,
    publishedVersionName: row.published_version_name,
    readyCount: row.ready_count,
    draftCount: row.draft_count,
  }));
}

export async function listSuiteVersions(db: D1DatabaseLike, suiteId?: string): Promise<SuiteVersionSummary[]> {
  const statement = suiteId
    ? db
        .prepare(`
          SELECT sv.id, sv.suite_id, s.suite_key, s.name AS suite_name, sv.human_name,
                 sv.status, sv.sample_count, sv.suite_hash, sv.created_at, sv.published_at
          FROM suite_versions sv
          INNER JOIN suites s ON s.id = sv.suite_id
          WHERE sv.suite_id = ?
          ORDER BY sv.created_at DESC
        `)
        .bind(suiteId)
    : db.prepare(`
        SELECT sv.id, sv.suite_id, s.suite_key, s.name AS suite_name, sv.human_name,
               sv.status, sv.sample_count, sv.suite_hash, sv.created_at, sv.published_at
        FROM suite_versions sv
        INNER JOIN suites s ON s.id = sv.suite_id
        ORDER BY sv.created_at DESC
      `);
  const { results = [] } = await statement.all<VersionRow>();
  return results.map(mapVersionRow);
}

export async function listSuiteDrafts(db: D1DatabaseLike, suiteId?: string): Promise<SuiteDraftSummary[]> {
  const statement = suiteId
    ? db
        .prepare(`
          SELECT sd.id, sd.suite_id, s.suite_key, s.name AS suite_name, sd.human_name,
                 sd.status, sd.created_at, sd.updated_at, COUNT(sds.id) AS sample_count
          FROM suite_drafts sd
          INNER JOIN suites s ON s.id = sd.suite_id
          LEFT JOIN suite_draft_samples sds ON sds.draft_id = sd.id AND sds.status = 'active'
          WHERE sd.suite_id = ? AND sd.status = 'draft'
          GROUP BY sd.id, sd.suite_id, s.suite_key, s.name, sd.human_name, sd.status, sd.created_at, sd.updated_at
          ORDER BY sd.updated_at DESC
        `)
        .bind(suiteId)
    : db.prepare(`
        SELECT sd.id, sd.suite_id, s.suite_key, s.name AS suite_name, sd.human_name,
               sd.status, sd.created_at, sd.updated_at, COUNT(sds.id) AS sample_count
        FROM suite_drafts sd
        INNER JOIN suites s ON s.id = sd.suite_id
        LEFT JOIN suite_draft_samples sds ON sds.draft_id = sd.id AND sds.status = 'active'
        WHERE sd.status = 'draft'
        GROUP BY sd.id, sd.suite_id, s.suite_key, s.name, sd.human_name, sd.status, sd.created_at, sd.updated_at
        ORDER BY sd.updated_at DESC
      `);
  const { results = [] } = await statement.all<DraftRow>();
  return results.map(mapDraftRow);
}

export async function getSuiteDraftDetail(db: D1DatabaseLike, draftId: string): Promise<SuiteDraftDetail | null> {
  const row = await db
    .prepare(`
      SELECT sd.id, sd.suite_id, s.suite_key, s.name AS suite_name, sd.human_name,
             sd.status, sd.created_at, sd.updated_at, COUNT(sds.id) AS sample_count
      FROM suite_drafts sd
      INNER JOIN suites s ON s.id = sd.suite_id
      LEFT JOIN suite_draft_samples sds ON sds.draft_id = sd.id AND sds.status = 'active'
      WHERE sd.id = ?
      GROUP BY sd.id, sd.suite_id, s.suite_key, s.name, sd.human_name, sd.status, sd.created_at, sd.updated_at
    `)
    .bind(draftId)
    .first<DraftRow>();
  if (!row) return null;
  return { ...mapDraftRow(row), samples: await listDraftSampleSummaries(db, draftId) };
}

export async function listPublishedSuiteSamples(db: D1DatabaseLike): Promise<PublishedSuiteSample[]> {
  const { results = [] } = await db
    .prepare(`
      SELECT s.suite_key, s.name AS suite_name, sv.human_name AS version_name,
             sample.stable_id, sample.input, sample.target, sample.category, sample.difficulty
      FROM suite_versions sv
      INNER JOIN suites s ON s.id = sv.suite_id
      INNER JOIN suite_version_samples sample ON sample.suite_version_id = sv.id
      WHERE sv.status = 'published'
      ORDER BY CASE s.suite_key WHEN 'knowledge' THEN 1 WHEN 'code' THEN 2 WHEN 'platforms' THEN 3 WHEN 'ecosystem' THEN 4 ELSE 5 END,
               sample.position ASC, sample.stable_id ASC
    `)
    .all<{
      suite_key: string;
      suite_name: string;
      version_name: string;
      stable_id: string;
      input: string;
      target: string;
      category: string;
      difficulty: string;
    }>();
  return results.map((row) => ({
    suiteKey: row.suite_key,
    suiteName: row.suite_name,
    versionName: row.version_name,
    stableId: row.stable_id,
    input: row.input,
    target: row.target,
    category: row.category,
    difficulty: row.difficulty,
  }));
}

export async function createSuiteDraft({
  db,
  suiteId,
  humanName,
  createdByUserId,
  createdByDisplayName,
}: {
  db: D1DatabaseLike;
  suiteId: string;
  humanName: string;
  createdByUserId: string;
  createdByDisplayName: string;
}): Promise<string> {
  validateHumanName(humanName);
  const draftId = `draft_${randomUUID()}`;
  await runD1(
    db
      .prepare(`
        INSERT INTO suite_drafts (id, suite_id, human_name, created_by_user_id, created_by_display_name)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(draftId, suiteId, humanName, createdByUserId, createdByDisplayName),
  );
  return draftId;
}

export async function cloneDraftFromVersion({
  db,
  suiteVersionId,
  humanName,
  createdByUserId,
  createdByDisplayName,
}: {
  db: D1DatabaseLike;
  suiteVersionId: string;
  humanName: string;
  createdByUserId: string;
  createdByDisplayName: string;
}): Promise<string> {
  validateHumanName(humanName);
  const version = await db
    .prepare("SELECT suite_id FROM suite_versions WHERE id = ?")
    .bind(suiteVersionId)
    .first<{ suite_id: string }>();
  if (!version) throw new Error("Suite version not found.");
  const draftId = await createSuiteDraft({ db, suiteId: version.suite_id, humanName, createdByUserId, createdByDisplayName });
  const { results = [] } = await db
    .prepare(`
      SELECT stable_id, input, target, choices_json, metadata_json, category, difficulty, position
      FROM suite_version_samples
      WHERE suite_version_id = ?
      ORDER BY position ASC, stable_id ASC
    `)
    .bind(suiteVersionId)
    .all<DraftSampleRow>();
  for (const sample of results) {
    await runD1(
      db
        .prepare(`
          INSERT INTO suite_draft_samples (id, draft_id, stable_id, input, target, choices_json, metadata_json, category, difficulty, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          `draft_sample_${randomUUID()}`,
          draftId,
          sample.stable_id,
          sample.input,
          sample.target,
          sample.choices_json,
          sample.metadata_json,
          sample.category,
          sample.difficulty,
          sample.position,
        ),
    );
  }
  return draftId;
}

export async function addDraftSample(db: D1DatabaseLike, draftId: string, input: DraftSampleInput): Promise<string> {
  validateDraftSample(input);
  const sampleId = `draft_sample_${randomUUID()}`;
  await runD1(
    db
      .prepare(`
        INSERT INTO suite_draft_samples (id, draft_id, stable_id, input, target, metadata_json, category, difficulty, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        sampleId,
        draftId,
        input.stableId,
        input.input,
        input.target,
        JSON.stringify(sampleMetadata(input)),
        input.category,
        input.difficulty,
        input.position ?? 0,
      ),
  );
  await touchDraft(db, draftId);
  return sampleId;
}

export async function updateSuiteDraft(db: D1DatabaseLike, draftId: string, humanName: string): Promise<void> {
  validateHumanName(humanName);
  await runD1(
    db
      .prepare("UPDATE suite_drafts SET human_name = ?, updated_at = ? WHERE id = ? AND status = 'draft'")
      .bind(humanName, new Date().toISOString(), draftId),
  );
}

export async function updateDraftSample(db: D1DatabaseLike, sampleId: string, input: DraftSampleInput): Promise<void> {
  validateDraftSample(input);
  const row = await db.prepare("SELECT draft_id FROM suite_draft_samples WHERE id = ?").bind(sampleId).first<{ draft_id: string }>();
  await runD1(
    db
      .prepare(`
        UPDATE suite_draft_samples
        SET stable_id = ?, input = ?, target = ?, metadata_json = ?, category = ?, difficulty = ?, position = ?, updated_at = ?
        WHERE id = ? AND status = 'active'
      `)
      .bind(
        input.stableId,
        input.input,
        input.target,
        JSON.stringify(sampleMetadata(input)),
        input.category,
        input.difficulty,
        input.position ?? 0,
        new Date().toISOString(),
        sampleId,
      ),
  );
  if (row) await touchDraft(db, row.draft_id);
}

export async function archiveDraftSample(db: D1DatabaseLike, sampleId: string): Promise<void> {
  const now = new Date().toISOString();
  const row = await db.prepare("SELECT draft_id FROM suite_draft_samples WHERE id = ?").bind(sampleId).first<{ draft_id: string }>();
  await runD1(
    db
      .prepare("UPDATE suite_draft_samples SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, sampleId),
  );
  if (row) await touchDraft(db, row.draft_id);
}

export async function freezeDraftAsReadyVersion({
  db,
  draftId,
  humanName,
  createdByUserId,
  createdByDisplayName,
}: {
  db: D1DatabaseLike;
  draftId: string;
  humanName: string;
  createdByUserId: string;
  createdByDisplayName: string;
}): Promise<string> {
  validateHumanName(humanName);
  const existing = await db.prepare("SELECT id FROM suite_versions WHERE human_name = ?").bind(humanName).first<{ id: string }>();
  if (existing) throw new Error(`Suite version name already exists: ${humanName}`);
  const draft = await db
    .prepare("SELECT suite_id FROM suite_drafts WHERE id = ? AND status = 'draft'")
    .bind(draftId)
    .first<{ suite_id: string }>();
  if (!draft) throw new Error("Draft not found.");
  const samples = await listDraftSamples(db, draftId);
  if (samples.length === 0) throw new Error("A ready suite version requires at least one active sample.");

  const versionId = `suite_version_${randomUUID()}`;
  const versionSamples = samples.map((sample) => ({ ...sample, sample_hash: hashJson(sampleForHash(sample)) }));
  const suiteHash = hashJson(versionSamples.map((sample) => ({ stableId: sample.stable_id, hash: sample.sample_hash })));
  await runD1(
    db
      .prepare(`
        INSERT INTO suite_versions (
          id, suite_id, human_name, status, sample_count, suite_hash, created_from_draft_id,
          created_by_user_id, created_by_display_name
        ) VALUES (?, ?, ?, 'ready', ?, ?, ?, ?, ?)
      `)
      .bind(versionId, draft.suite_id, humanName, versionSamples.length, suiteHash, draftId, createdByUserId, createdByDisplayName),
  );
  for (const sample of versionSamples) {
    await runD1(
      db
        .prepare(`
          INSERT INTO suite_version_samples (
            id, suite_version_id, stable_id, input, target, choices_json, metadata_json,
            category, difficulty, position, sample_hash, source_draft_sample_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          `suite_sample_${randomUUID()}`,
          versionId,
          sample.stable_id,
          sample.input,
          sample.target,
          sample.choices_json,
          sample.metadata_json,
          sample.category,
          sample.difficulty,
          sample.position,
          sample.sample_hash,
          sample.id,
        ),
    );
  }
  return versionId;
}

export async function publishReadyVersion(db: D1DatabaseLike, suiteVersionId: string): Promise<void> {
  const version = await db
    .prepare("SELECT suite_id, status FROM suite_versions WHERE id = ?")
    .bind(suiteVersionId)
    .first<{ suite_id: string; status: string }>();
  if (!version || version.status !== "ready") throw new Error("Only ready suite versions can be published.");
  await assertVersionHasFullCoverage(db, suiteVersionId);
  const now = new Date().toISOString();
  await runD1(
    db
      .prepare("UPDATE suite_versions SET status = 'archived', archived_at = ? WHERE suite_id = ? AND status = 'published'")
      .bind(now, version.suite_id),
  );
  await runD1(
    db
      .prepare("UPDATE suite_versions SET status = 'published', published_at = ? WHERE id = ?")
      .bind(now, suiteVersionId),
  );
}

async function assertVersionHasFullCoverage(db: D1DatabaseLike, suiteVersionId: string): Promise<void> {
  const samples = await db
    .prepare(`
      SELECT id
      FROM suite_version_samples
      WHERE suite_version_id = ?
      ORDER BY stable_id ASC
    `)
    .bind(suiteVersionId)
    .all<{ id: string }>();

  const missing: string[] = [];
  for (const sample of samples.results ?? []) {
    for (const model of evaluatedModels) {
      const covered = await db
        .prepare(`
          SELECT result.id
          FROM eval_results result
          INNER JOIN eval_jobs job ON job.id = result.job_id
          INNER JOIN eval_runs run ON run.id = result.run_id
          WHERE job.suite_sample_id = ?
            AND result.model_id = ?
            AND run.status = 'completed'
            AND result.score IS NOT NULL
          LIMIT 1
        `)
        .bind(sample.id, model.modelId)
        .first<{ id: string }>();
      if (!covered) missing.push(`${sample.id}:${model.modelId}`);
    }
  }

  if (missing.length > 0) {
    throw new Error("Suite version requires 100% benchmark coverage before publishing.");
  }
}

async function listDraftSamples(db: D1DatabaseLike, draftId: string): Promise<DraftSampleRow[]> {
  const { results = [] } = await db
    .prepare(`
      SELECT id, stable_id, input, target, choices_json, metadata_json, category, difficulty, position
      FROM suite_draft_samples
      WHERE draft_id = ? AND status = 'active'
      ORDER BY position ASC, stable_id ASC
    `)
    .bind(draftId)
    .all<DraftSampleRow>();
  return results;
}

async function listDraftSampleSummaries(db: D1DatabaseLike, draftId: string): Promise<DraftSampleSummary[]> {
  const rows = await listDraftSamples(db, draftId);
  return rows.map((row) => {
    const metadata = row.metadata_json ? JSON.parse(row.metadata_json) as Record<string, unknown> : {};
    return {
      id: row.id,
      stableId: row.stable_id,
      input: row.input,
      target: row.target,
      acceptedTargets: Array.isArray(metadata.acceptedTargets) ? metadata.acceptedTargets.filter((v): v is string => typeof v === "string") : [],
      tags: Array.isArray(metadata.tags) ? metadata.tags.filter((v): v is string => typeof v === "string") : [],
      category: row.category,
      difficulty: row.difficulty,
      rationale: typeof metadata.rationale === "string" ? metadata.rationale : null,
      position: row.position,
    };
  });
}

async function touchDraft(db: D1DatabaseLike, draftId: string): Promise<void> {
  await runD1(db.prepare("UPDATE suite_drafts SET updated_at = ? WHERE id = ?").bind(new Date().toISOString(), draftId));
}

function mapVersionRow(row: VersionRow): SuiteVersionSummary {
  return {
    id: row.id,
    suiteId: row.suite_id,
    suiteKey: row.suite_key,
    suiteName: row.suite_name,
    humanName: row.human_name,
    status: row.status,
    sampleCount: row.sample_count,
    suiteHash: row.suite_hash,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

function mapDraftRow(row: DraftRow): SuiteDraftSummary {
  return {
    id: row.id,
    suiteId: row.suite_id,
    suiteKey: row.suite_key,
    suiteName: row.suite_name,
    humanName: row.human_name,
    status: row.status,
    sampleCount: row.sample_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateHumanName(value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(value)) {
    throw new Error("Version and draft names must be 3-64 characters of letters, numbers, underscores, or dashes.");
  }
}

function validateDraftSample(input: DraftSampleInput): void {
  if (!input.stableId.trim()) throw new Error("Stable sample id is required.");
  if (!input.input.trim()) throw new Error("Sample prompt is required.");
  if (!input.target.trim()) throw new Error("Sample target is required.");
  if (!input.category.trim()) throw new Error("Sample category is required.");
  if (!input.difficulty.trim()) throw new Error("Sample difficulty is required.");
}

function sampleMetadata(input: DraftSampleInput): Record<string, unknown> {
  return {
    acceptedTargets: input.acceptedTargets ?? [],
    tags: input.tags ?? [],
    category: input.category,
    difficulty: input.difficulty,
    rationale: input.rationale,
  };
}

function sampleForHash(sample: DraftSampleRow): unknown {
  return {
    stableId: sample.stable_id,
    input: sample.input,
    target: sample.target,
    choices: sample.choices_json ? JSON.parse(sample.choices_json) : null,
    metadata: sample.metadata_json ? JSON.parse(sample.metadata_json) : null,
    category: sample.category,
    difficulty: sample.difficulty,
  };
}
