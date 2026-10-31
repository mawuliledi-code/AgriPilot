-- AgriPilot: PostgreSQL Functions, Triggers and Procedures



-- 1. FUNCTION: COUNT CROPS ON A FARM

-- Returns the number of crops belonging to
-- a particular farm.

CREATE OR REPLACE FUNCTION count_farm_crops(p_farm_id INTEGER)
RETURNS INTEGER
LANGUAGE SQL
AS $$
    SELECT COUNT(*)::INTEGER
    FROM crops
    WHERE farm_id = p_farm_id;
$$;

-- Example:
-- SELECT count_farm_crops(1);


-- 2. AUDIT TABLE FOR ACTION STATUS CHANGES

-- Stores a record whenever an action becomes
-- completed.

CREATE TABLE IF NOT EXISTS action_status_log (
    log_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action_id INTEGER NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- 3. TRIGGER FUNCTION

-- Runs automatically when an action's status
-- changes to completed.

CREATE OR REPLACE FUNCTION log_action_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO action_status_log (
        action_id,
        old_status,
        new_status
    )
    VALUES (
        NEW.action_id,
        OLD.status,
        NEW.status
    );

    RETURN NEW;
END;
$$;



-- 4. CREATE THE TRIGGER


DROP TRIGGER IF EXISTS trg_action_completed
ON recommended_actions;

CREATE TRIGGER trg_action_completed
AFTER UPDATE OF status
ON recommended_actions
FOR EACH ROW
WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status = 'completed'
)
EXECUTE FUNCTION log_action_completion();



-- 5. STORED PROCEDURE

-- Changes a recommended action to completed.
-- The trigger above automatically logs the change.

CREATE OR REPLACE PROCEDURE complete_recommended_action(
    p_action_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE recommended_actions
    SET status = 'completed'
    WHERE action_id = p_action_id
      AND status IS DISTINCT FROM 'completed';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Action % does not exist or is already completed',
            p_action_id;
    END IF;
END;
$$;



-- 6. CHECK THE FUNCTION AND TRIGGER LOG


-- Test the crop-count function:
-- SELECT count_farm_crops(1);

-- View action status changes:
-- SELECT * FROM action_status_log
-- ORDER BY changed_at DESC;

-- Test the procedure only with an action
-- that is not already completed:
-- CALL complete_recommended_action(2);


-- 7. TESTING AND VERIFICATION

-- Test 1: Count the number of crops on farm 1.
-- Expected result: 2
SELECT count_farm_crops(1);

-- Test 2: Create a new pending action for testing.
-- This test action was created successfully with action_id = 3.
-- INSERT INTO recommended_actions (
--     farm_id, crop_id, description, due_date, status
-- )
-- VALUES (
--     1, 2, 'Test trigger: inspect maize', CURRENT_DATE, 'pending'
-- )
-- RETURNING action_id, description, status;

-- Test 3: Complete action 3 using the stored procedure.
-- The procedure executed successfully.
-- CALL complete_recommended_action(3);

-- Test 4: Verify that the trigger recorded the status change.
SELECT *
FROM action_status_log
ORDER BY changed_at DESC;

-- Verified result:
-- action_id: 3
-- old_status: pending
-- new_status: completed
--
-- The trigger automatically recorded the status change
-- in action_status_log after the stored procedure completed.
