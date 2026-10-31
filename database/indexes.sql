
-- =====================================================
-- AgriPilot: PostgreSQL Indexes
-- =====================================================
-- Indexes help PostgreSQL find records faster and
-- improve the performance of searches and joins.


-- 1. INDEX ON FARMS
-- Find farms belonging to a particular user.

CREATE INDEX IF NOT EXISTS idx_farms_user_id
ON farms(user_id);


-- 2. INDEX ON CROPS (FARM ID)
-- Find crops belonging to a particular farm.

CREATE INDEX IF NOT EXISTS idx_crops_farm_id
ON crops(farm_id);


-- 3. INDEX ON CROPS (STATUS)
-- Find crops by their current status.

CREATE INDEX IF NOT EXISTS idx_crops_status
ON crops(status);


-- 4. INDEX ON CARE ACTIVITIES
-- Find care activities belonging to a particular crop.

CREATE INDEX IF NOT EXISTS idx_care_activities_crop_id
ON care_activities(crop_id);


-- 5. INDEX ON RECOMMENDED ACTIONS
-- Find recommended actions belonging to a particular farm.

CREATE INDEX IF NOT EXISTS idx_recommended_actions_farm_id
ON recommended_actions(farm_id);


-- 6. INDEX ON ACTION COMPLETIONS
-- Find completion records belonging to a particular action.

CREATE INDEX IF NOT EXISTS idx_action_completions_action_id
ON action_completions(action_id);



-- =====================================================
-- VERIFY THE MAIN AGRIPILOT INDEXES
-- =====================================================
-- This query displays the indexes created on the
-- main AgriPilot database tables.

SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
      'farms',
      'crops',
      'care_activities',
      'recommended_actions',
      'action_completions'
  )
ORDER BY tablename, indexname;



-- =====================================================
-- QUERY PERFORMANCE TEST
-- =====================================================
-- This experiment uses a temporary table.
-- It does not modify the six main AgriPilot tables.


-- STEP 1: Remove the previous temporary test table,
-- if it exists in the current database session.

DROP TABLE IF EXISTS pg_temp.crop_performance_test;


-- STEP 2: Create a temporary performance test table.

CREATE TEMP TABLE crop_performance_test (
    crop_id INTEGER,
    farm_id INTEGER,
    crop_name VARCHAR(100),
    status VARCHAR(30)
);


-- STEP 3: Insert 50,000 sample records.
-- The records are distributed across 100 farms.

INSERT INTO crop_performance_test (
    crop_id,
    farm_id,
    crop_name,
    status
)
SELECT
    n,
    ((n - 1) % 100) + 1,
    'Sample Crop ' || n,
    'growing'
FROM generate_series(1, 50000) AS n;



-- =====================================================
-- TEST 1: QUERY WITHOUT AN INDEX
-- =====================================================
-- PostgreSQL can use a Sequential Scan to search
-- through the table when no suitable index exists.

EXPLAIN ANALYZE
SELECT *
FROM crop_performance_test
WHERE farm_id = 50;



-- =====================================================
-- TEST 2: CREATE AN INDEX
-- =====================================================
-- Create an index on farm_id to help PostgreSQL
-- find matching records more efficiently.

CREATE INDEX IF NOT EXISTS idx_crop_performance_farm_id
ON crop_performance_test(farm_id);



-- =====================================================
-- TEST 3: QUERY WITH THE INDEX AVAILABLE
-- =====================================================
-- Run the same query again.
-- PostgreSQL can now use the index if its query
-- planner estimates that doing so is efficient.

EXPLAIN ANALYZE
SELECT *
FROM crop_performance_test
WHERE farm_id = 50;



-- PERFORMANCE COMPARISON

-- Previously recorded test measurements:
--
-- Without index: 11.489 ms
-- With index:      5.571 ms
--
-- Observed reduction: approximately 51.5%
--
-- IMPORTANT:
-- These are individual measurements from the
-- previous experiment. Execution times can vary
-- depending on caching and system activity.
--
-- PostgreSQL chooses the query execution plan
-- it estimates to be most efficient.
--
-- The temporary performance test table is not
-- part of the permanent AgriPilot database.
