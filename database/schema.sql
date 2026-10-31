-- AgriPilot PostgreSQL Database Schema
-- This script documents the database structure.
-- Run it only on a fresh database, not on the existing one.

CREATE TABLE users (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE farms (
    farm_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    farm_name VARCHAR(150) NOT NULL,
    location VARCHAR(150) NOT NULL,
    farm_size NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_farms_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE crops (
    crop_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    farm_id INTEGER NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    planting_date DATE,
    expected_harvest_date DATE,
    status VARCHAR(30) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_crops_farm
        FOREIGN KEY (farm_id)
        REFERENCES farms(farm_id)
        ON DELETE CASCADE
);

CREATE TABLE care_activities (
    activity_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    crop_id INTEGER NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    activity_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_care_activities_crop
        FOREIGN KEY (crop_id)
        REFERENCES crops(crop_id)
        ON DELETE CASCADE
);

CREATE TABLE recommended_actions (
    action_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    farm_id INTEGER NOT NULL,
    crop_id INTEGER,
    description TEXT NOT NULL,
    due_date DATE,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_actions_farm
        FOREIGN KEY (farm_id)
        REFERENCES farms(farm_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_actions_crop
        FOREIGN KEY (crop_id)
        REFERENCES crops(crop_id)
        ON DELETE SET NULL
);

CREATE TABLE action_completions (
    completion_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action_id INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT fk_completions_action
        FOREIGN KEY (action_id)
        REFERENCES recommended_actions(action_id)
        ON DELETE CASCADE
);

-- Additional audit table:
-- The action_status_log table is created in
-- functions-triggers.sql as part of the trigger implementation.