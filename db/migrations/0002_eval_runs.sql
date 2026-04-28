-- Eval artifact persistence schema.
-- Mirrors the local run-log shape before any authenticated API/dashboard exists.

CREATE TABLE IF NOT EXISTS eval_runs (
  id TEXT PRIMARY KEY,
  suite_id TEXT NOT NULL,
  suite_name TEXT NOT NULL,
  suite_description TEXT,
  suite_version TEXT NOT NULL,
  suite_source_path TEXT NOT NULL,
  suite_sample_count INTEGER NOT NULL,
  suite_sample_hash TEXT NOT NULL,
  harness_version TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  model_count INTEGER NOT NULL,
  result_count INTEGER NOT NULL,
  scored_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  accuracy REAL,
  mean_score REAL,
  mean_latency_ms REAL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  upstream_inference_cost REAL NOT NULL DEFAULT 0,
  models_json TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS eval_samples (
  suite_id TEXT NOT NULL,
  suite_version TEXT NOT NULL,
  sample_id TEXT NOT NULL,
  input TEXT NOT NULL,
  target TEXT,
  choices_json TEXT,
  metadata_json TEXT,
  sample_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (suite_id, suite_version, sample_id)
);

CREATE TABLE IF NOT EXISTS eval_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  suite_id TEXT NOT NULL,
  sample_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  output TEXT NOT NULL,
  extracted TEXT,
  score_name TEXT NOT NULL,
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
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS eval_runs_suite_started_idx ON eval_runs (suite_id, started_at DESC);
CREATE INDEX IF NOT EXISTS eval_results_run_idx ON eval_results (run_id);
CREATE INDEX IF NOT EXISTS eval_results_model_idx ON eval_results (model_id);
