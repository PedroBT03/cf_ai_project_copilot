CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planning',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(project_id) REFERENCES projects(id)
);