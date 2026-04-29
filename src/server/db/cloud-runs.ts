import { createHash, randomUUID } from "node:crypto";

import { evaluatedModels, findEvaluatedModel } from "@/data/models";
import type { EvalJobQueueMessage } from "@/server/runtime/cloudflare";
import { runD1, type D1DatabaseLike } from "./types";

export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type CreateCloudRunInput = {
  db: D1DatabaseLike;
  queue: Queue<EvalJobQueueMessage>;
  suiteVersionIds: string[];
  modelIds: string[];
  createdByUserId: string;
  createdByDisplayName: string;
  modelSetLabel?: string;
};

type SuiteVersionRow = {
  id: string;
  suite_id: string;
  suite_key: string;
  suite_name: string;
  human_name: string;
  status: "ready" | "published" | "archived";
  sample_count: number;
  suite_hash: string;
};

type SuiteVersionSampleRow = {
  id: string;
  suite_version_id: string;
  stable_id: string;
  input: string;
  target: string;
  choices_json: string | null;
  metadata_json: string | null;
  category: string;
  difficulty: string;
  sample_hash: string;
};

type EvalJobRow = {
  id: string;
  run_id: string;
  suite_id: string;
  suite_version_id: string;
  suite_sample_id: string;
  sample_stable_id: string;
  sample_hash: string;
  model_id: string;
  model_config_hash: string;
  status: JobStatus;
  attempts: number;
};

export type EvalJobSummary = EvalJobRow & {
  suite_key: string;
  suite_human_name: string;
};

export type RunJobProgress = {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
};

type RunRow = {
  id: string;
  status: RunStatus;
};

export async function createCloudBenchmarkRun(input: CreateCloudRunInput): Promise<{ runId: string; jobCount: number }> {
  const suiteVersions = await getRunnableSuiteVersions(input.db, input.suiteVersionIds);
  if (suiteVersions.length !== input.suiteVersionIds.length) {
    throw new Error("One or more suite versions are missing or not benchmarkable.");
  }

  const models = input.modelIds.map((modelId) => {
    const model = findEvaluatedModel(modelId);
    if (!model) {
      throw new Error(`Unknown registered model: ${modelId}`);
    }
    return model;
  });
  if (models.length === 0) {
    throw new Error("At least one registered model is required.");
  }

  const samplesByVersion = new Map<string, SuiteVersionSampleRow[]>();
  for (const version of suiteVersions) {
    const samples = await getSuiteVersionSamples(input.db, version.id);
    if (samples.length === 0) {
      throw new Error(`Suite version ${version.human_name} has no samples.`);
    }
    samplesByVersion.set(version.id, samples);
  }

  const now = new Date().toISOString();
  const runId = `benchmark_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const suiteName = suiteVersions.map((version) => version.suite_name).join(" + ");
  const suiteVersion = suiteVersions.map((version) => version.human_name).join("+");
  const suiteHash = hashJson(suiteVersions.map((version) => ({ id: version.id, hash: version.suite_hash })));
  const sampleCount = Array.from(samplesByVersion.values()).reduce((sum, samples) => sum + samples.length, 0);

  await runD1(
    input.db
      .prepare(`
        INSERT INTO eval_runs (
          id, status, visibility, suite_id, suite_name, suite_version, suite_source_path,
          suite_sample_count, suite_sample_hash, harness_version, queued_at, started_at,
          created_by_user_id, created_by_display_name, model_count, result_count,
          models_json, metrics_json, model_set_label
        ) VALUES (?, 'queued', 'private', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)
      `)
      .bind(
        runId,
        suiteVersions.length === 1 ? suiteVersions[0].suite_key : "multi-suite",
        suiteName,
        suiteVersion,
        "d1:suite_versions",
        sampleCount,
        suiteHash,
        "cloud-v1",
        now,
        now,
        input.createdByUserId,
        input.createdByDisplayName,
        models.length,
        sampleCount * models.length,
        JSON.stringify(models.map((model) => ({ modelId: model.modelId, displayName: model.displayName, provider: model.provider }))),
        input.modelSetLabel ?? "custom",
      ),
  );

  for (const version of suiteVersions) {
    await runD1(
      input.db
        .prepare(`
          INSERT INTO eval_run_suites (run_id, suite_id, suite_version_id, suite_key, suite_human_name, suite_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(runId, version.suite_id, version.id, version.suite_key, version.human_name, version.suite_hash),
    );
  }

  const messages: MessageSendRequest<EvalJobQueueMessage>[] = [];
  for (const version of suiteVersions) {
    const samples = samplesByVersion.get(version.id) ?? [];
    for (const sample of samples) {
      for (const model of models) {
        const jobId = `job_${randomUUID()}`;
        await runD1(
          input.db
            .prepare(`
              INSERT INTO eval_jobs (
                id, run_id, suite_id, suite_version_id, suite_sample_id, sample_stable_id,
                sample_hash, model_id, model_config_hash, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')
            `)
            .bind(
              jobId,
              runId,
              version.suite_id,
              version.id,
              sample.id,
              sample.stable_id,
              sample.sample_hash,
              model.modelId,
              hashJson({ modelId: model.modelId, temperature: model.temperature, maxTokens: model.maxTokens }),
            ),
        );
        messages.push({ body: { runId, jobId } });
      }
    }
  }

  for (let index = 0; index < messages.length; index += 100) {
    await input.queue.sendBatch(messages.slice(index, index + 100));
  }

  await runD1(
    input.db
      .prepare("UPDATE eval_runs SET status = 'running', updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), runId),
  );

  return { runId, jobCount: messages.length };
}

export async function getRunnableSuiteVersions(db: D1DatabaseLike, suiteVersionIds: string[]): Promise<SuiteVersionRow[]> {
  if (suiteVersionIds.length === 0) {
    throw new Error("At least one suite version is required.");
  }

  const versions: SuiteVersionRow[] = [];
  for (const id of unique(suiteVersionIds)) {
    const row = await db
      .prepare(`
        SELECT sv.id, sv.suite_id, s.suite_key, s.name AS suite_name, sv.human_name,
               sv.status, sv.sample_count, sv.suite_hash
        FROM suite_versions sv
        INNER JOIN suites s ON s.id = sv.suite_id
        WHERE sv.id = ? AND sv.status IN ('ready', 'published')
      `)
      .bind(id)
      .first<SuiteVersionRow>();
    if (row) versions.push(row);
  }
  return versions;
}

export async function getSuiteVersionSamples(db: D1DatabaseLike, suiteVersionId: string): Promise<SuiteVersionSampleRow[]> {
  const { results = [] } = await db
    .prepare(`
      SELECT id, suite_version_id, stable_id, input, target, choices_json, metadata_json,
             category, difficulty, sample_hash
      FROM suite_version_samples
      WHERE suite_version_id = ?
      ORDER BY position ASC, stable_id ASC
    `)
    .bind(suiteVersionId)
    .all<SuiteVersionSampleRow>();
  return results;
}

export async function getEvalJob(db: D1DatabaseLike, jobId: string): Promise<EvalJobRow | null> {
  return db
    .prepare(`
      SELECT id, run_id, suite_id, suite_version_id, suite_sample_id, sample_stable_id,
             sample_hash, model_id, model_config_hash, status, attempts
      FROM eval_jobs
      WHERE id = ?
    `)
    .bind(jobId)
    .first<EvalJobRow>();
}

export async function getRunStatus(db: D1DatabaseLike, runId: string): Promise<RunRow | null> {
  return db.prepare("SELECT id, status FROM eval_runs WHERE id = ?").bind(runId).first<RunRow>();
}

export async function cancelCloudRun(db: D1DatabaseLike, runId: string): Promise<void> {
  const now = new Date().toISOString();
  await runD1(
    db
      .prepare("UPDATE eval_runs SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND status IN ('queued', 'running', 'failed')")
      .bind(now, now, runId),
  );
  await runD1(
    db
      .prepare("UPDATE eval_jobs SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE run_id = ? AND status = 'queued'")
      .bind(now, now, runId),
  );
}

export async function retryEvalJob(db: D1DatabaseLike, queue: Queue<EvalJobQueueMessage>, jobId: string): Promise<void> {
  const job = await getEvalJob(db, jobId);
  if (!job) {
    throw new Error(`Unknown eval job: ${jobId}`);
  }
  const run = await getRunStatus(db, job.run_id);
  if (!run || run.status === "cancelled") {
    throw new Error("Cancelled or missing runs cannot be retried.");
  }
  const now = new Date().toISOString();
  await runD1(
    db
      .prepare("UPDATE eval_jobs SET status = 'queued', queued_at = ?, started_at = NULL, completed_at = NULL, cancelled_at = NULL, last_error = NULL, updated_at = ? WHERE id = ?")
      .bind(now, now, jobId),
  );
  await runD1(db.prepare("UPDATE eval_runs SET status = 'running', updated_at = ? WHERE id = ?").bind(now, job.run_id));
  await queue.send({ runId: job.run_id, jobId });
}

export async function retryFailedJobs(
  db: D1DatabaseLike,
  queue: Queue<EvalJobQueueMessage>,
  input: { runId: string; suiteVersionId?: string; modelId?: string },
): Promise<number> {
  const conditions = ["run_id = ?", "status = 'failed'"];
  const values: unknown[] = [input.runId];
  if (input.suiteVersionId) {
    conditions.push("suite_version_id = ?");
    values.push(input.suiteVersionId);
  }
  if (input.modelId) {
    conditions.push("model_id = ?");
    values.push(input.modelId);
  }
  const { results = [] } = await db
    .prepare(`SELECT id FROM eval_jobs WHERE ${conditions.join(" AND ")} ORDER BY id ASC`)
    .bind(...values)
    .all<{ id: string }>();
  for (const row of results) {
    await retryEvalJob(db, queue, row.id);
  }
  return results.length;
}

export async function getRunJobProgress(db: D1DatabaseLike, runId: string): Promise<RunJobProgress> {
  const { results = [] } = await db
    .prepare("SELECT status, COUNT(*) AS count FROM eval_jobs WHERE run_id = ? GROUP BY status")
    .bind(runId)
    .all<{ status: JobStatus; count: number }>();
  const progress: RunJobProgress = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, total: 0 };
  for (const row of results) {
    progress[row.status] = row.count;
    progress.total += row.count;
  }
  return progress;
}

export async function listRunJobs(db: D1DatabaseLike, runId: string): Promise<EvalJobSummary[]> {
  const { results = [] } = await db
    .prepare(`
      SELECT job.id, job.run_id, job.suite_id, job.suite_version_id, job.suite_sample_id,
             job.sample_stable_id, job.sample_hash, job.model_id, job.model_config_hash,
             job.status, job.attempts, suites.suite_key, versions.human_name AS suite_human_name
      FROM eval_jobs job
      INNER JOIN suites ON suites.id = job.suite_id
      INNER JOIN suite_versions versions ON versions.id = job.suite_version_id
      WHERE job.run_id = ?
      ORDER BY suites.suite_key, job.model_id, job.sample_stable_id
    `)
    .bind(runId)
    .all<EvalJobSummary>();
  return results;
}

export async function finalizeRunIfComplete(db: D1DatabaseLike, runId: string): Promise<void> {
  const { results: statusRows = [] } = await db
    .prepare("SELECT status, COUNT(*) AS count FROM eval_jobs WHERE run_id = ? GROUP BY status")
    .bind(runId)
    .all<{ status: JobStatus; count: number }>();
  const pending = statusRows.some((row) => row.status === "queued" || row.status === "running");
  if (pending || statusRows.length === 0) return;

  const run = await getRunStatus(db, runId);
  if (!run || run.status === "cancelled") return;

  const metrics = await aggregateRunMetrics(db, runId);
  const failedJobs = statusRows.find((row) => row.status === "failed")?.count ?? 0;
  const completedAt = new Date().toISOString();
  await runD1(
    db
      .prepare(`
        UPDATE eval_runs
        SET status = ?, completed_at = ?, updated_at = ?, result_count = ?, scored_count = ?,
            error_count = ?, accuracy = ?, mean_score = ?, mean_latency_ms = ?, total_tokens = ?,
            prompt_tokens = ?, completion_tokens = ?, total_cost = ?, upstream_inference_cost = ?,
            metrics_json = ?
        WHERE id = ?
      `)
      .bind(
        failedJobs > 0 ? "failed" : "completed",
        completedAt,
        completedAt,
        metrics.resultCount,
        metrics.scoredCount,
        metrics.errorCount,
        metrics.accuracy,
        metrics.meanScore,
        metrics.meanLatencyMs,
        metrics.totalTokens,
        metrics.promptTokens,
        metrics.completionTokens,
        metrics.totalCost,
        metrics.upstreamInferenceCost,
        JSON.stringify(metrics),
        runId,
      ),
  );
}

async function aggregateRunMetrics(db: D1DatabaseLike, runId: string) {
  const row = await db
    .prepare(`
      SELECT COUNT(*) AS result_count,
             COUNT(score) AS scored_count,
             SUM(CASE WHEN error IS NULL THEN 0 ELSE 1 END) AS error_count,
             AVG(score) AS mean_score,
             AVG(score) AS accuracy,
             AVG(latency_ms) AS mean_latency_ms,
             SUM(COALESCE(total_tokens, 0)) AS total_tokens,
             SUM(COALESCE(prompt_tokens, 0)) AS prompt_tokens,
             SUM(COALESCE(completion_tokens, 0)) AS completion_tokens,
             SUM(COALESCE(cost, 0)) AS total_cost,
             SUM(COALESCE(upstream_inference_cost, 0)) AS upstream_inference_cost
      FROM eval_results
      WHERE run_id = ?
    `)
    .bind(runId)
    .first<{
      result_count: number;
      scored_count: number;
      error_count: number;
      mean_score: number | null;
      accuracy: number | null;
      mean_latency_ms: number | null;
      total_tokens: number | null;
      prompt_tokens: number | null;
      completion_tokens: number | null;
      total_cost: number | null;
      upstream_inference_cost: number | null;
    }>();

  return {
    resultCount: row?.result_count ?? 0,
    scoredCount: row?.scored_count ?? 0,
    errorCount: row?.error_count ?? 0,
    meanScore: row?.mean_score ?? null,
    accuracy: row?.accuracy ?? null,
    meanLatencyMs: row?.mean_latency_ms ?? null,
    totalTokens: row?.total_tokens ?? 0,
    promptTokens: row?.prompt_tokens ?? 0,
    completionTokens: row?.completion_tokens ?? 0,
    totalCost: row?.total_cost ?? 0,
    upstreamInferenceCost: row?.upstream_inference_cost ?? 0,
  };
}

export function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function registeredModelIds(): string[] {
  return evaluatedModels.map((model) => model.modelId);
}
