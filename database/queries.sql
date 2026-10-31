-- AgriPilot SQL Queries
-- These queries demonstrate database retrieval,
-- filtering, sorting, joining and aggregation.

-- 1. Display all users
SELECT * FROM users;


-- 2. Display all farms
SELECT * FROM farms;


-- 3. Find all crops
SELECT * FROM crops;


-- 4. Filter crops by status
SELECT crop_name, status
FROM crops
WHERE status = 'ready';


-- 5. Filter crops by status and farm
SELECT crop_name, status, farm_id
FROM crops
WHERE status = 'growing'
  AND farm_id = 1;


-- 6. Find crops whose names begin with T
SELECT crop_name
FROM crops
WHERE crop_name LIKE 'T%';


-- 7. Display unique crop statuses
SELECT DISTINCT status
FROM crops;


-- 8. Sort crops alphabetically
SELECT crop_name
FROM crops
ORDER BY crop_name ASC;


-- 9. Find the first crop alphabetically
SELECT crop_name
FROM crops
ORDER BY crop_name ASC
LIMIT 1;


-- 10. Count crops on each farm
SELECT f.farm_name, COUNT(c.crop_id) AS total_crops
FROM farms f
LEFT JOIN crops c ON f.farm_id = c.farm_id
GROUP BY f.farm_id, f.farm_name;


-- 11. Show each farmer and their farm
SELECT
    u.name AS farmer,
    f.farm_name,
    f.location,
    f.farm_size
FROM users u
JOIN farms f ON u.user_id = f.user_id;


-- 12. Show crops and their care activities
SELECT
    c.crop_name,
    ca.activity_type,
    ca.activity_date,
    ca.notes
FROM crops c
JOIN care_activities ca ON c.crop_id = ca.crop_id
ORDER BY ca.activity_date;


-- 13. Show recommended actions and their completions
SELECT
    ra.description,
    ra.status,
    ac.completed_at,
    ac.notes
FROM recommended_actions ra
JOIN action_completions ac ON ra.action_id = ac.action_id;


-- 14. Calculate the average farm size
SELECT AVG(farm_size) AS average_farm_size
FROM farms;


-- 15. Calculate total farm size
SELECT SUM(farm_size) AS total_farm_size
FROM farms;


-- 16. Find the largest farm
SELECT MAX(farm_size) AS largest_farm
FROM farms;


-- 17. Find the smallest farm
SELECT MIN(farm_size) AS smallest_farm
FROM farms;

-- 18. Display recommended action status history
SELECT
    action_id,
    old_status,
    new_status,
    changed_at
FROM action_status_log
ORDER BY changed_at DESC;