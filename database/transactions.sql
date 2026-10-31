
-- AgriPilot: Database Transactions
-- Demonstrates COMMIT, ROLLBACK and ACID


-- 1. CREATE A TEST RECOMMENDED ACTION
-- Test action created successfully.
-- Generated action_id: 2

INSERT INTO recommended_actions (
    farm_id,
    crop_id,
    description,
    due_date,
    status
)
VALUES (
    1,
    2,
    'Test maize inspection',
    CURRENT_DATE,
    'pending'
);


-- 2. COMMIT EXAMPLE
-- Both operations are saved together.

BEGIN;

-- Update action status.
UPDATE recommended_actions
SET status = 'completed'
WHERE action_id = 2;

-- Record action completion.
INSERT INTO action_completions (
    action_id,
    notes
)
VALUES (
    2,
    'Test action completed successfully.'
);

-- Permanently save both operations.
COMMIT;


-- 3. ROLLBACK EXAMPLE
-- Demonstrates cancelling an uncommitted change.

BEGIN;

-- Temporarily change status.
UPDATE recommended_actions
SET status = 'pending'
WHERE action_id = 2;

-- Cancel the temporary change.
ROLLBACK;


-- 4. VERIFY THE RESULTS

SELECT
    ra.action_id,
    ra.description,
    ra.status,
    ac.completed_at,
    ac.notes
FROM recommended_actions ra
LEFT JOIN action_completions ac
    ON ra.action_id = ac.action_id
WHERE ra.action_id = 2;


-- 5. ACID PRINCIPLES

-- ATOMICITY:
-- Both completion operations succeed together
-- or the transaction can be rolled back.

-- CONSISTENCY:
-- Database constraints must remain satisfied.

-- ISOLATION:
-- Concurrent transactions should not interfere
-- improperly with one another.

-- DURABILITY:
-- Once committed, changes are permanently saved.



-- TEST RESULTS


-- COMMIT:
-- Action 2 status changed to completed.
-- Completion record successfully inserted.

-- ROLLBACK:
-- Temporary change from completed to pending
-- was cancelled.

-- FINAL STATUS:
-- Action 2 remains completed.
