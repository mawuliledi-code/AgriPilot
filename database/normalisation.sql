-- AgriPilot: Database Normalisation
-- Demonstrates First, Second and Third Normal Forms.
-- These are teaching examples; they do not modify
-- the six existing AgriPilot tables.


-- 1NF: FIRST NORMAL FORM

-- Rule: Each column should contain one value
-- per row. Avoid storing lists in a single cell.

-- NOT GOOD: several pests stored in one field.
-- crop_name | pests
-- Tomatoes  | Aphids, Whiteflies, Caterpillars

-- BETTER: one pest per row in a separate table.
-- Proposed table; not yet part of the live schema.

CREATE TABLE IF NOT EXISTS crop_pests_example (
    crop_id INTEGER NOT NULL,
    pest_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (crop_id, pest_name)
);

-- Example records:
INSERT INTO crop_pests_example (crop_id, pest_name)
VALUES
    (1, 'Aphids'),
    (1, 'Whiteflies'),
    (1, 'Caterpillars');

-- Each row now contains one pest for one crop.



-- 2NF: SECOND NORMAL FORM

-- Rule: The table must be in 1NF, and every
-- non-key column must depend on the WHOLE
-- primary key, not just part of a composite key.

-- Imagine a table with a composite key:
-- (farm_id, crop_id)
--
-- farm_name depends only on farm_id.
-- crop_name depends only on crop_id.
-- Therefore, these details should be stored
-- in their own tables, not repeated in this
-- combined table.

-- AgriPilot separates farms and crops:
-- farms: farm_id is the primary key.
-- crops: crop_id is the primary key and
-- farm_id links each crop to its farm.


-- 3NF: THIRD NORMAL FORM

-- Rule: The table must be in 2NF, and
-- non-key columns must not depend on other
-- non-key columns.

-- Imagine storing farmer details in every
-- farm record:
--
-- farm_id | user_id | farmer_name | farmer_email
--
-- farmer_name and farmer_email depend on
-- user_id, not directly on farm_id.
-- This creates unnecessary duplication.

-- AgriPilot separates these details:
-- users stores name and email.
-- farms stores user_id as a foreign key.
--
-- This means farmer details are stored once
-- in users and connected to farms through user_id.



-- CHECK THE EXISTING TABLE RELATIONSHIPS


SELECT
    f.farm_name,
    u.name AS farmer_name,
    c.crop_name
FROM farms f
JOIN users u
    ON f.user_id = u.user_id
LEFT JOIN crops c
    ON f.farm_id = c.farm_id
ORDER BY f.farm_name, c.crop_name;