CREATE TABLE IF NOT EXISTS project_documents (
  id SERIAL PRIMARY KEY,
  client_project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('renders', 'drawings', 'boq')),
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
