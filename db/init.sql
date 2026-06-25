CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_files (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  property_type TEXT,
  area TEXT,
  client_since DATE,
  measurements_date DATE,
  handover_date DATE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A client's engagement with the studio. Distinct from `projects` above
-- (which holds public portfolio case studies shown on project-detail.html).
CREATE TABLE client_projects (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  stage SMALLINT NOT NULL DEFAULT 0,
  stage_statuses JSONB NOT NULL DEFAULT '["draft","draft","draft","draft","draft","draft"]',
  status TEXT NOT NULL DEFAULT 'wait',
  budget_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  client_project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  active_variant INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE room_variants (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE room_photos (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES room_variants(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  caption TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE photo_comments (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES room_photos(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  x NUMERIC,
  y NUMERIC,
  created_by INTEGER,
  author_name TEXT,
  from_studio BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE spec_categories (
  id SERIAL PRIMARY KEY,
  client_project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE spec_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES spec_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room TEXT,
  note TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'wait',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE site_visits (
  id SERIAL PRIMARY KEY,
  client_project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,
  note TEXT,
  file_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
