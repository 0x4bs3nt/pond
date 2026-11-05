-- Synthetic fixtures, applied in one transaction. Existing schemas are never replaced.
CREATE SCHEMA pond_demo;
SET LOCAL search_path TO pond_demo, pg_catalog;

CREATE TABLE members (
    id bigint PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE,
    active boolean NOT NULL DEFAULT true,
    balance numeric(24, 6) NOT NULL,
    joined_at timestamptz NOT NULL,
    birthday date,
    notes text,
    tags text[] NOT NULL,
    metadata jsonb NOT NULL
);

INSERT INTO members
SELECT
    9007199254740992 + n::bigint,
    CASE n WHEN 1 THEN 'Emily Carter' WHEN 2 THEN 'James Wilson' ELSE 'Member ' || n END,
    CASE WHEN n % 10 = 0 THEN NULL ELSE 'member' || n || '@example.test' END,
    n % 4 <> 0,
    CASE WHEN n = 1 THEN 123456789012345678.123456 ELSE (n - 125) * 12.345678 END,
    TIMESTAMPTZ '2025-01-01 12:00:00+00' + n * INTERVAL '1 day',
    CASE WHEN n % 3 = 0 THEN NULL ELSE DATE '1990-01-01' + n END,
    CASE n % 5
        WHEN 0 THEN NULL
        WHEN 1 THEN ''
        WHEN 2 THEN E'First line\nSecond line\tTabbed value'
        WHEN 3 THEN repeat('Long text with Unicode: garden 🌱. ', 20)
        ELSE 'Regular member'
    END,
    CASE WHEN n % 2 = 0 THEN ARRAY[]::text[] ELSE ARRAY['demo', 'member-' || n] END,
    jsonb_build_object('tier', CASE WHEN n % 3 = 0 THEN 'pro' ELSE 'free' END,
        'settings', jsonb_build_object('alerts', n % 2 = 0))
FROM generate_series(1, 250) AS n;

CREATE TABLE projects (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    archived_at timestamptz
);
INSERT INTO projects (name, archived_at) VALUES
    ('Pond', NULL), ('Documentation', NULL), ('Archived project', '2025-02-01 00:00:00+00');

CREATE TABLE project_members (
    project_id integer REFERENCES projects(id),
    member_id bigint REFERENCES members(id),
    role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    PRIMARY KEY (project_id, member_id)
);
INSERT INTO project_members
SELECT 1 + n % 3, 9007199254740992 + n::bigint,
    CASE WHEN n % 3 = 0 THEN 'owner' WHEN n % 3 = 1 THEN 'editor' ELSE 'viewer' END
FROM generate_series(1, 30) AS n;

CREATE TABLE events (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id bigint NOT NULL REFERENCES members(id),
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL
);
INSERT INTO events (member_id, occurred_at, payload)
SELECT 9007199254740992 + n::bigint,
    TIMESTAMPTZ '2025-03-01 00:00:00+00' + n * INTERVAL '1 minute',
    jsonb_build_object('action', 'project.opened', 'projectId', 1 + n % 3)
FROM generate_series(1, 120) AS n;

CREATE TABLE audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    message text NOT NULL
);

CREATE VIEW active_members AS SELECT id, name, balance FROM members WHERE active;

CREATE TABLE "Odd identifiers" (
    "ID" uuid PRIMARY KEY,
    "select" text NOT NULL,
    "Binary data" bytea,
    "Local timestamp" timestamp NOT NULL,
    "Duration" interval NOT NULL
);
INSERT INTO "Odd identifiers" VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Spaces, mixed case, and a reserved word',
    decode('00ff1020', 'hex'),
    '2025-03-01 14:30:00',
    '2 days 3 hours'
);
