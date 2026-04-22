export async function ensureDbSchema(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        goal TEXT,
        status TEXT DEFAULT 'planning',
        workflow_instance_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        order_index INTEGER DEFAULT 0,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS workflow_events (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        step TEXT NOT NULL,
        status TEXT NOT NULL,
        detail TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`
    )
    .run();

  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`)
    .run();

  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_workflow_events_project ON workflow_events(project_id)`)
    .run();
}
