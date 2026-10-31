
# AgriPilot – Entity Relationship Diagram (ERD)

This diagram represents the PostgreSQL assessment database for AgriPilot.

## Database Entities and Relationships

```mermaid
erDiagram
    USERS ||--o{ FARMS : owns
    FARMS ||--o{ CROPS : contains
    CROPS ||--o{ CARE_ACTIVITIES : receives
    FARMS ||--o{ RECOMMENDED_ACTIONS : has
    CROPS o|--o{ RECOMMENDED_ACTIONS : relates_to
    RECOMMENDED_ACTIONS ||--o{ ACTION_COMPLETIONS : records

    USERS {
        int user_id PK
        varchar name
        varchar email UK
        varchar password_hash
        timestamp created_at
    }

    FARMS {
        int farm_id PK
        int user_id FK
        varchar farm_name
        varchar location
        numeric farm_size
        timestamp created_at
    }

    CROPS {
        int crop_id PK
        int farm_id FK
        varchar crop_name
        date planting_date
        date expected_harvest_date
        varchar status
        timestamp created_at
    }

    CARE_ACTIVITIES {
        int activity_id PK
        int crop_id FK
        varchar activity_type
        date activity_date
        text notes
        timestamp created_at
    }

    RECOMMENDED_ACTIONS {
        int action_id PK
        int farm_id FK
        int crop_id FK "nullable"
        text description
        date due_date
        varchar status
        timestamp created_at
    }

    ACTION_COMPLETIONS {
        int completion_id PK
        int action_id FK
        timestamp completed_at
        text notes
    }

    ACTION_STATUS_LOG {
        int log_id PK
        int action_id
        varchar old_status
        varchar new_status
        timestamp changed_at
    }
```

## Relationship Explanation

| Relationship | Meaning |
|---|---|
| USERS → FARMS | One user can own multiple farms. |
| FARMS → CROPS | One farm can contain multiple crops. |
| CROPS → CARE_ACTIVITIES | One crop can have multiple care activities. |
| FARMS → RECOMMENDED_ACTIONS | One farm can have multiple recommended actions. |
| CROPS → RECOMMENDED_ACTIONS | A crop can be associated with multiple actions; the crop reference is optional. |
| RECOMMENDED_ACTIONS → ACTION_COMPLETIONS | One action can have multiple completion records. |

## Key Explanation

- **PK:** Primary Key – uniquely identifies a record.
- **FK:** Foreign Key – references a record in another table.
- **UK:** Unique Key – prevents duplicate values.
- **1:N:** One-to-many relationship.

## Audit Table

`ACTION_STATUS_LOG` records changes in recommended action status.

Its `action_id` is not declared as a foreign key in the current PostgreSQL schema. Therefore, no formal relationship line is drawn to another table.

## Database Note

PostgreSQL is used as a separate database assessment component. The current running AgriPilot application uses MongoDB.
