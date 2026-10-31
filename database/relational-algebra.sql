-- AgriPilot: Relational Algebra and SQL
-- Examples of core relational database operations.


-- 1. SELECTION (σ)

-- Relational algebra:
-- σ status = 'ready' (CROPS)
--
-- Meaning: Select only rows where the crop
-- status is ready.

SELECT *
FROM crops
WHERE status = 'ready';



-- 2. PROJECTION (π)

-- Relational algebra:
-- π crop_name, status (CROPS)
--
-- Meaning: Return only the crop_name and
-- status columns.

SELECT crop_name, status
FROM crops;


-- 3. JOIN (⋈)

-- Relational algebra:
-- FARMS ⋈ CROPS
--
-- Meaning: Combine farms with their crops
-- using the matching farm_id.

SELECT
    farms.farm_name,
    crops.crop_name,
    crops.status
FROM farms
JOIN crops
    ON farms.farm_id = crops.farm_id;



-- 4. UNION (∪)

-- Meaning: Combine compatible result sets.
-- Both SELECT statements must return the
-- same number of columns with compatible types.
--
-- This example lists crop names from two
-- separate status groups.
-- UNION removes duplicate rows.
-- UNION ALL keeps duplicate rows.

SELECT crop_name
FROM crops
WHERE status = 'ready'

UNION

SELECT crop_name
FROM crops
WHERE status = 'growing';


-- 5. COMBINED OPERATION

-- Find crops belonging to farms in Accra.
-- This combines JOIN and SELECTION.

SELECT
    f.farm_name,
    f.location,
    c.crop_name,
    c.status
FROM farms f
JOIN crops c
    ON f.farm_id = c.farm_id
WHERE f.location = 'Accra, Ghana';