-- Cloud-native suite authoring and async benchmark execution.

PRAGMA foreign_keys = off;

CREATE TABLE IF NOT EXISTS eval_runs_new (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public_candidate', 'public')),
  suite_id TEXT NOT NULL,
  suite_name TEXT NOT NULL,
  suite_description TEXT,
  suite_version TEXT NOT NULL,
  suite_source_path TEXT NOT NULL,
  suite_sample_count INTEGER NOT NULL,
  suite_sample_hash TEXT NOT NULL,
  harness_version TEXT NOT NULL,
  queued_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_by_user_id TEXT,
  created_by_display_name TEXT,
  failure_reason TEXT,
  model_count INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  scored_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  accuracy REAL,
  mean_score REAL,
  mean_latency_ms REAL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  upstream_inference_cost REAL NOT NULL DEFAULT 0,
  models_json TEXT NOT NULL DEFAULT '[]',
  metrics_json TEXT NOT NULL DEFAULT '{}',
  model_set_label TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO eval_runs_new (
  id, status, visibility, suite_id, suite_name, suite_description, suite_version,
  suite_source_path, suite_sample_count, suite_sample_hash, harness_version,
  queued_at, started_at, completed_at, model_count, result_count, scored_count,
  error_count, accuracy, mean_score, mean_latency_ms, total_tokens, prompt_tokens,
  completion_tokens, total_cost, upstream_inference_cost, models_json, metrics_json,
  created_at, updated_at
)
SELECT
  id, 'completed', 'public', suite_id, suite_name, suite_description, suite_version,
  suite_source_path, suite_sample_count, suite_sample_hash, harness_version,
  started_at, started_at, completed_at, model_count, result_count, scored_count,
  error_count, accuracy, mean_score, mean_latency_ms, total_tokens, prompt_tokens,
  completion_tokens, total_cost, upstream_inference_cost, models_json, metrics_json,
  created_at, created_at
FROM eval_runs;

DROP TABLE eval_runs;
ALTER TABLE eval_runs_new RENAME TO eval_runs;

PRAGMA foreign_keys = on;

CREATE INDEX IF NOT EXISTS eval_runs_suite_started_idx ON eval_runs (suite_id, started_at DESC);
CREATE INDEX IF NOT EXISTS eval_runs_status_idx ON eval_runs (status, visibility, started_at DESC);

CREATE TABLE IF NOT EXISTS suites (
  id TEXT PRIMARY KEY,
  suite_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
);

INSERT OR IGNORE INTO suites (id, suite_key, name, description) VALUES
  ('suite_knowledge', 'knowledge', 'Minecraft Feature and History Knowledge', 'Minecraft features, dates, releases, and historical knowledge.'),
  ('suite_code', 'code', 'Minecraft Source Code Knowledge', 'Minecraft source code, implementation details, and modding-relevant internals.'),
  ('suite_platforms', 'platforms', 'Minecraft Content Platforms Knowledge', 'CurseForge, Modrinth, plugin platforms, and content distribution knowledge.'),
  ('suite_ecosystem', 'ecosystem', 'Minecraft Ecosystem Knowledge', 'Forge, Fabric, NeoForge, plugins, loaders, and broader ecosystem knowledge.');

CREATE TABLE IF NOT EXISTS suite_drafts (
  id TEXT PRIMARY KEY,
  suite_id TEXT NOT NULL REFERENCES suites(id),
  human_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'archived')),
  created_by_user_id TEXT,
  created_by_display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS suite_draft_samples (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES suite_drafts(id) ON DELETE CASCADE,
  stable_id TEXT NOT NULL,
  input TEXT NOT NULL,
  target TEXT NOT NULL,
  choices_json TEXT,
  metadata_json TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT,
  UNIQUE (draft_id, stable_id)
);

CREATE TABLE IF NOT EXISTS suite_versions (
  id TEXT PRIMARY KEY,
  suite_id TEXT NOT NULL REFERENCES suites(id),
  human_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('ready', 'published', 'archived')),
  sample_count INTEGER NOT NULL,
  suite_hash TEXT NOT NULL,
  created_from_draft_id TEXT REFERENCES suite_drafts(id),
  created_by_user_id TEXT,
  created_by_display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  archived_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS suite_versions_one_published_idx
  ON suite_versions (suite_id)
  WHERE status = 'published';

CREATE TABLE IF NOT EXISTS suite_version_samples (
  id TEXT PRIMARY KEY,
  suite_version_id TEXT NOT NULL REFERENCES suite_versions(id) ON DELETE CASCADE,
  stable_id TEXT NOT NULL,
  input TEXT NOT NULL,
  target TEXT NOT NULL,
  choices_json TEXT,
  metadata_json TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  sample_hash TEXT NOT NULL,
  source_draft_sample_id TEXT,
  UNIQUE (suite_version_id, stable_id)
);

CREATE TABLE IF NOT EXISTS eval_run_suites (
  run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  suite_id TEXT NOT NULL REFERENCES suites(id),
  suite_version_id TEXT NOT NULL REFERENCES suite_versions(id),
  suite_key TEXT NOT NULL,
  suite_human_name TEXT NOT NULL,
  suite_hash TEXT NOT NULL,
  PRIMARY KEY (run_id, suite_version_id)
);

CREATE TABLE IF NOT EXISTS eval_jobs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  suite_id TEXT NOT NULL REFERENCES suites(id),
  suite_version_id TEXT NOT NULL REFERENCES suite_versions(id),
  suite_sample_id TEXT NOT NULL REFERENCES suite_version_samples(id),
  sample_stable_id TEXT NOT NULL,
  sample_hash TEXT NOT NULL,
  model_id TEXT NOT NULL,
  model_config_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  queued_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  last_error TEXT,
  reused_from_result_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (run_id, model_id, suite_sample_id)
);

CREATE INDEX IF NOT EXISTS eval_jobs_run_status_idx ON eval_jobs (run_id, status);
CREATE INDEX IF NOT EXISTS eval_jobs_model_idx ON eval_jobs (model_id);

CREATE TABLE IF NOT EXISTS eval_job_attempts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES eval_jobs(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'cancelled')),
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  output TEXT NOT NULL DEFAULT '',
  extracted TEXT,
  score_name TEXT,
  score REAL,
  score_explanation TEXT,
  error TEXT,
  latency_ms REAL NOT NULL DEFAULT 0,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost REAL,
  upstream_inference_cost REAL,
  raw_json TEXT,
  UNIQUE (job_id, attempt)
);

ALTER TABLE eval_results ADD COLUMN job_id TEXT;
ALTER TABLE eval_results ADD COLUMN suite_version_id TEXT;
ALTER TABLE eval_results ADD COLUMN sample_stable_id TEXT;
ALTER TABLE eval_results ADD COLUMN sample_hash TEXT;
ALTER TABLE eval_results ADD COLUMN model_config_hash TEXT;
ALTER TABLE eval_results ADD COLUMN reused_from_result_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS eval_results_job_idx ON eval_results (job_id) WHERE job_id IS NOT NULL;
