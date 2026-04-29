export type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatementLike;
};

export type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run?(): Promise<unknown>;
};

export async function runD1(statement: D1PreparedStatementLike): Promise<void> {
  if (!statement.run) {
    throw new Error("D1 statement run() is required for writes.");
  }
  await statement.run();
}
