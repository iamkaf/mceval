import { includesAnyScorer } from "@/eval/scorer";
import type { EvalSample } from "@/eval/schema";
import { findEvaluatedModel } from "@/data/models";
import {
  finalizeRunIfComplete,
  getEvalJob,
  getRunStatus,
  hashJson,
} from "@/server/db/cloud-runs";
import { runD1, type D1DatabaseLike } from "@/server/db/types";
import { createOpenRouterClient, runOpenRouterChat } from "@/server/openrouter/client";
import { requireEvalConsumerEnv, type EvalJobQueueMessage, type McevalRuntimeEnv } from "@/server/runtime/cloudflare";

type QueueMessage = Message<EvalJobQueueMessage>;

type QueueSampleRow = {
  id: string;
  stable_id: string;
  input: string;
  target: string;
  choices_json: string | null;
  metadata_json: string | null;
};

export async function processEvalQueueBatch(
  batch: MessageBatch<EvalJobQueueMessage>,
  rawEnv: McevalRuntimeEnv,
  _ctx: ExecutionContext,
): Promise<void> {
  const env = requireEvalConsumerEnv(rawEnv);
  const client = createOpenRouterClient({ apiKey: env.OPENROUTER_API_KEY });

  await Promise.all(
    batch.messages.map((message) => processEvalQueueMessage({ db: env.DB, message, client })),
  );
}

async function processEvalQueueMessage({
  db,
  message,
  client,
}: {
  db: D1DatabaseLike;
  message: QueueMessage;
  client: ReturnType<typeof createOpenRouterClient>;
}) {
  const body = parseMessageBody(message.body);
  if (!body) {
    message.ack();
    return;
  }

  const job = await getEvalJob(db, body.jobId);
  if (!job || job.run_id !== body.runId) {
    message.ack();
    return;
  }

  const run = await getRunStatus(db, job.run_id);
  if (!run || run.status === "cancelled") {
    await cancelJob(db, job.id);
    message.ack();
    return;
  }

  if (job.status === "completed" || job.status === "cancelled") {
    message.ack();
    return;
  }

  const model = findEvaluatedModel(job.model_id);
  if (!model) {
    await failJobPermanently(db, job.id, job.run_id, job.attempts + 1, "Registered model is missing.");
    await finalizeRunIfComplete(db, job.run_id);
    message.ack();
    return;
  }

  const sampleRow = await getJobSample(db, job.suite_sample_id);
  if (!sampleRow) {
    await failJobPermanently(db, job.id, job.run_id, job.attempts + 1, "Suite version sample is missing.");
    await finalizeRunIfComplete(db, job.run_id);
    message.ack();
    return;
  }

  const attempt = job.attempts + 1;
  const startedAt = new Date().toISOString();
  await runD1(
    db
      .prepare("UPDATE eval_jobs SET status = 'running', attempts = ?, started_at = ?, updated_at = ? WHERE id = ?")
      .bind(attempt, startedAt, startedAt, job.id),
  );

  try {
    const response = await runOpenRouterChat({
      client,
      model: model.modelId,
      messages: [{ role: "user", content: sampleRow.input }],
      temperature: model.temperature,
      maxTokens: model.maxTokens,
    });
    const latestRun = await getRunStatus(db, job.run_id);
    if (!latestRun || latestRun.status === "cancelled") {
      await recordCancelledAttempt(db, job.id, job.run_id, attempt, startedAt);
      await cancelJob(db, job.id);
      message.ack();
      return;
    }

    const sample = sampleFromRow(sampleRow);
    const score = includesAnyScorer.score({ sample, output: response.text });
    const completedAt = new Date().toISOString();
    await insertAttempt(db, {
      jobId: job.id,
      runId: job.run_id,
      attempt,
      status: "completed",
      startedAt,
      completedAt,
      output: response.text,
      extracted: score.extracted,
      scoreName: score.name,
      score: score.score,
      scoreExplanation: score.explanation,
      latencyMs: response.latencyMs,
      usage: response.usage,
      raw: response.raw,
    });
    await upsertResult(db, {
      id: `result_${job.id}`,
      jobId: job.id,
      runId: job.run_id,
      suiteId: job.suite_id,
      suiteVersionId: job.suite_version_id,
      sampleId: job.suite_sample_id,
      sampleStableId: job.sample_stable_id,
      sampleHash: job.sample_hash,
      modelId: model.modelId,
      modelConfigHash: job.model_config_hash,
      output: response.text,
      extracted: score.extracted,
      scoreName: score.name,
      score: score.score,
      scoreExplanation: score.explanation,
      latencyMs: response.latencyMs,
      usage: response.usage,
      raw: response.raw,
    });
    await completeJob(db, job.id, completedAt);
    await finalizeRunIfComplete(db, job.run_id);
    message.ack();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const completedAt = new Date().toISOString();
    await insertAttempt(db, {
      jobId: job.id,
      runId: job.run_id,
      attempt,
      status: "failed",
      startedAt,
      completedAt,
      output: "",
      scoreName: includesAnyScorer.name,
      score: null,
      error: reason,
      latencyMs: 0,
    });

    if (message.attempts < 3) {
      await runD1(
        db
          .prepare("UPDATE eval_jobs SET status = 'queued', last_error = ?, updated_at = ? WHERE id = ?")
          .bind(reason, completedAt, job.id),
      );
      message.retry({ delaySeconds: Math.min(300, 10 * message.attempts ** 2) });
      return;
    }

    await runD1(
      db
        .prepare("UPDATE eval_jobs SET status = 'failed', completed_at = ?, last_error = ?, updated_at = ? WHERE id = ?")
        .bind(completedAt, reason, completedAt, job.id),
    );
    await finalizeRunIfComplete(db, job.run_id);
    message.ack();
  }
}

function parseMessageBody(body: unknown): EvalJobQueueMessage | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Partial<EvalJobQueueMessage>;
  if (typeof value.runId !== "string" || typeof value.jobId !== "string") return null;
  return { runId: value.runId, jobId: value.jobId };
}

async function getJobSample(db: D1DatabaseLike, sampleId: string): Promise<QueueSampleRow | null> {
  return db
    .prepare("SELECT id, stable_id, input, target, choices_json, metadata_json FROM suite_version_samples WHERE id = ?")
    .bind(sampleId)
    .first<QueueSampleRow>();
}

function sampleFromRow(row: QueueSampleRow): EvalSample {
  const metadata = row.metadata_json ? JSON.parse(row.metadata_json) as Record<string, unknown> : {};
  return {
    id: row.stable_id,
    input: row.input,
    target: row.target,
    choices: row.choices_json ? JSON.parse(row.choices_json) as string[] : undefined,
    metadata,
  };
}

async function cancelJob(db: D1DatabaseLike, jobId: string): Promise<void> {
  const now = new Date().toISOString();
  await runD1(
    db
      .prepare("UPDATE eval_jobs SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, jobId),
  );
}

async function failJobPermanently(db: D1DatabaseLike, jobId: string, runId: string, attempt: number, error: string): Promise<void> {
  const now = new Date().toISOString();
  await insertAttempt(db, {
    jobId,
    runId,
    attempt,
    status: "failed",
    startedAt: now,
    completedAt: now,
    output: "",
    scoreName: includesAnyScorer.name,
    score: null,
    error,
    latencyMs: 0,
  });
  await runD1(
    db
      .prepare("UPDATE eval_jobs SET status = 'failed', attempts = ?, completed_at = ?, last_error = ?, updated_at = ? WHERE id = ?")
      .bind(attempt, now, error, now, jobId),
  );
}

async function recordCancelledAttempt(db: D1DatabaseLike, jobId: string, runId: string, attempt: number, startedAt: string): Promise<void> {
  const completedAt = new Date().toISOString();
  await insertAttempt(db, {
    jobId,
    runId,
    attempt,
    status: "cancelled",
    startedAt,
    completedAt,
    output: "",
    scoreName: includesAnyScorer.name,
    score: null,
    error: "Run was cancelled.",
    latencyMs: 0,
  });
}

async function completeJob(db: D1DatabaseLike, jobId: string, completedAt: string): Promise<void> {
  await runD1(
    db
      .prepare("UPDATE eval_jobs SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?")
      .bind(completedAt, completedAt, jobId),
  );
}

async function insertAttempt(
  db: D1DatabaseLike,
  attempt: {
    jobId: string;
    runId: string;
    attempt: number;
    status: "completed" | "failed" | "cancelled";
    startedAt: string;
    completedAt: string;
    output: string;
    extracted?: string;
    scoreName?: string;
    score?: number | null;
    scoreExplanation?: string;
    error?: string;
    latencyMs: number;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; cost?: number; upstreamInferenceCost?: number };
    raw?: unknown;
  },
): Promise<void> {
  await runD1(
    db
      .prepare(`
        INSERT OR REPLACE INTO eval_job_attempts (
          id, job_id, run_id, attempt, status, started_at, completed_at, output,
          extracted, score_name, score, score_explanation, error, latency_ms,
          prompt_tokens, completion_tokens, total_tokens, cost, upstream_inference_cost, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        `attempt_${attempt.jobId}_${attempt.attempt}`,
        attempt.jobId,
        attempt.runId,
        attempt.attempt,
        attempt.status,
        attempt.startedAt,
        attempt.completedAt,
        attempt.output,
        attempt.extracted ?? null,
        attempt.scoreName ?? null,
        attempt.score ?? null,
        attempt.scoreExplanation ?? null,
        attempt.error ?? null,
        attempt.latencyMs,
        attempt.usage?.promptTokens ?? null,
        attempt.usage?.completionTokens ?? null,
        attempt.usage?.totalTokens ?? null,
        attempt.usage?.cost ?? null,
        attempt.usage?.upstreamInferenceCost ?? null,
        attempt.raw === undefined ? null : JSON.stringify(attempt.raw),
      ),
  );
}

async function upsertResult(
  db: D1DatabaseLike,
  result: {
    id: string;
    jobId: string;
    runId: string;
    suiteId: string;
    suiteVersionId: string;
    sampleId: string;
    sampleStableId: string;
    sampleHash: string;
    modelId: string;
    modelConfigHash: string;
    output: string;
    extracted?: string;
    scoreName: string;
    score: number | null;
    scoreExplanation?: string;
    latencyMs: number;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; cost?: number; upstreamInferenceCost?: number };
    raw?: unknown;
  },
): Promise<void> {
  await runD1(
    db
      .prepare(`
        INSERT OR REPLACE INTO eval_results (
          id, run_id, suite_id, sample_id, model_id, output, extracted, score_name,
          score, score_explanation, error, latency_ms, prompt_tokens, completion_tokens,
          total_tokens, cost, upstream_inference_cost, raw_json, job_id, suite_version_id,
          sample_stable_id, sample_hash, model_config_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        result.id,
        result.runId,
        result.suiteId,
        result.sampleId,
        result.modelId,
        result.output,
        result.extracted ?? null,
        result.scoreName,
        result.score,
        result.scoreExplanation ?? null,
        result.latencyMs,
        result.usage?.promptTokens ?? null,
        result.usage?.completionTokens ?? null,
        result.usage?.totalTokens ?? null,
        result.usage?.cost ?? null,
        result.usage?.upstreamInferenceCost ?? null,
        result.raw === undefined ? null : JSON.stringify(result.raw),
        result.jobId,
        result.suiteVersionId,
        result.sampleStableId,
        result.sampleHash,
        result.modelConfigHash || hashJson({ modelId: result.modelId }),
      ),
  );
}
