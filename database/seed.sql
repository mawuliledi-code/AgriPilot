-- AgriPilot sample data
-- Run this only after creating the tables in a fresh database.

-- 1. Create a demo user
INSERT INTO users (name, email, password_hash)
VALUES (
    'Ben Mensah',
    'Ben.demo@example.com',
    'demo_hash_placeholder'
);

-- 2. Create a farm for the user
INSERT INTO farms (user_id, farm_name, location, farm_size)
VALUES (
    1,
    'Ben Farm',
    'Accra, Ghana',
    5.00
);

-- 3. Add crops to the farm
INSERT INTO crops (
    farm_id, crop_name, planting_date,
    expected_harvest_date, status
)
VALUES
    (1, 'Tomatoes', '2026-09-20', '2026-12-20', 'ready'),
    (1, 'Maize', '2026-09-25', '2027-01-10', 'growing');

-- 4. Record crop care activities
INSERT INTO care_activities (
    crop_id, activity_type, activity_date, notes
)
VALUES
    (1, 'Watering', '2026-10-30',
     'Tomato crops were watered.'),
    (2, 'Fertilising', '2026-10-30',
     'Fertiliser was applied to the maize crops.');

-- 5. Create a recommended action
INSERT INTO recommended_actions (
    farm_id, crop_id, description, due_date, status
)
VALUES (
    1, 1, 'Harvest the tomatoes', '2026-11-05', 'completed'
);

-- 6. Record completion of the action
INSERT INTO action_completions (action_id, notes)
VALUES (
    1,
    'Tomatoes were successfully harvested.'
);