ALTER TABLE actions ADD COLUMN start_subzone TEXT CHECK(start_subzone IN ('a','b','c','d'));
ALTER TABLE actions ADD COLUMN end_subzone   TEXT CHECK(end_subzone   IN ('a','b','c','d'));
