-- Accent-insensitive keyword search: unaccent lets a query like "med" match a
-- name like "Médore". Used at query time in the trigram relevance (see the list
-- repository), so the STABLE unaccent() is fine — no immutable wrapper needed.
CREATE EXTENSION IF NOT EXISTS unaccent;
