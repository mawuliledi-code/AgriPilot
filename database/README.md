# AgriPilot – PostgreSQL Database Documentation

## 1. Project Overview

AgriPilot is a web-based agricultural management system designed to help farmers manage farms, monitor crops, record crop health observations, access weather information and organise recommended agricultural actions.

The application uses **PostgreSQL as its primary relational database**. PostgreSQL is integrated with the Node.js and Express backend through the `pg` (node-postgres) library.

The database stores application information and maintains relationships between users, farms, crops, crop health observations and other agricultural records.

This database component also demonstrates important relational database concepts, including database design, normalisation, SQL operations, relational algebra, indexing, transactions, functions, triggers and stored procedures.

## 2. Technologies Used

| Technology | Purpose |
|---|---|
| PostgreSQL | Primary relational database |
| pg (node-postgres) | Connects the backend to PostgreSQL |
| pgAdmin 4 | Database administration and SQL testing |
| SQL | Database definition and manipulation |
| Node.js | Backend runtime environment |
| Express.js | Backend API framework |
| React | Frontend user interface |
| Visual Studio Code | Application and database development |
| Git and GitHub | Version control |

## 3. Database Structure

The PostgreSQL database used by the project is named `agripilot_db`.

It contains related tables that support the application's main features.

The main application entities include:

| Table | Purpose |
|---|---|
| `users` | Stores user account information |
| `farms` | Stores farms associated with users |
| `crops` | Stores crops registered under farms |
| `crop_health_observations` | Records pest, disease and other crop health observations |
| `care_activities` | Stores agricultural maintenance activities |
| `recommended_actions` | Stores recommended agricultural actions |
| `farmer_action_completions` | Records completed recommended actions |
| `action_status_log` | Maintains an audit history of action status changes |
| `fertilizer_transactions` | Stores fertilizer-related transaction records |

The database schema defines tables, primary keys, foreign keys and constraints to support data integrity and relationships between records.

For the authoritative table definitions, refer to `schema.sql`.

## 4. Database Relationships

The database uses primary keys and foreign keys to connect related records.

The main relationships include:

- One user can have multiple farms.
- One farm can contain multiple crops.
- One crop can have multiple crop health observations.
- One crop can have multiple care activities.
- Recommended actions can be associated with farms and crops.
- Recommended actions can have associated completion records.
- Action status changes can be recorded in an audit log.

These relationships help maintain referential integrity and organise agricultural information consistently.

Refer to the database schema and `diagrams/er-diagram.md` for the Entity Relationship Diagram.

## 5. Normalisation

The database design separates related information into individual tables to reduce unnecessary duplication and improve data consistency.

The database assessment demonstrates:

- First Normal Form (1NF)
- Second Normal Form (2NF)
- Third Normal Form (3NF)

Normalisation helps minimise data duplication, reduce update anomalies and maintain reliable relationships between records.

Refer to `normalisation.sql` for the explanations and examples.

## 6. SQL Operations Demonstrated

The database assessment demonstrates a range of SQL operations, including:

- `CREATE TABLE`
- `INSERT`
- `SELECT`
- `UPDATE`
- `DELETE`
- `WHERE`
- `ORDER BY`
- `LIMIT`
- `DISTINCT`
- `JOIN`
- `GROUP BY`
- `COUNT`, `SUM`, `AVG`, `MIN` and `MAX`
- `UNION`

These operations support database creation, data insertion, retrieval, modification and analysis.

Refer to `queries.sql` and `relational-algebra.sql` for examples.

## 7. Indexing and Query Performance

Indexes can improve data retrieval performance, particularly when queries frequently search or join records using specific columns.

The project includes indexing work covering areas such as:

- Farm ownership
- Crop-to-farm relationships
- Crop status
- Crop care activities
- Recommended actions
- Action completion records

A performance experiment was conducted using a temporary table containing 50,000 sample crop records.

The query was tested before and after creating an index on `farm_id`.

| Test | Query plan | Observed execution time |
|---|---|---:|
| Before indexing | Sequential Scan | 11.489 ms |
| After indexing | Bitmap Index Scan and Bitmap Heap Scan | 5.571 ms |

The observed execution time decreased in this test. Actual performance can vary depending on database cache, system load, hardware and query conditions.

Indexes can improve retrieval performance, although they also require storage and can introduce overhead during data modifications.

Refer to `indexes.sql` for the index definitions and performance experiment.

## 8. Transactions and ACID Properties

PostgreSQL supports transactions to ensure that database operations are handled reliably.

The database assessment demonstrates:

- `BEGIN`
- `COMMIT`
- `ROLLBACK`

It also explains the four ACID properties:

- **Atomicity:** A transaction is completed entirely or rolled back.
- **Consistency:** Transactions maintain database rules and constraints.
- **Isolation:** Concurrent transactions are controlled to prevent unwanted interference.
- **Durability:** Committed changes are preserved.

Transaction examples demonstrate how database changes can be committed successfully or reversed using rollback.

Refer to `transactions.sql` for the examples and test documentation.

## 9. Advanced Database Features

The database assessment includes PostgreSQL functions, triggers and stored procedures to demonstrate database automation and audit logging.

### 9.1 User-Defined Functions

User-defined functions allow reusable database operations to be performed using SQL.

The assessment includes the function `count_farm_crops(p_farm_id)`, which counts the number of crops registered under a particular farm.

Example:

```sql
SELECT count_farm_crops(1);
```

The documented test returned `2` for farm 1 at the time of testing.

### 9.2 Database Triggers

Database triggers can automatically execute actions when specified database events occur.

The assessment includes the trigger `trg_action_completed`, which records a status change when a recommended action becomes completed.

The audit information includes:

- Action ID
- Previous status
- New status
- Date and time of the change

The trigger records this information in the `action_status_log` audit table.

### 9.3 Stored Procedures

Stored procedures allow database operations to be organised into reusable routines.

The assessment includes the procedure `complete_recommended_action(p_action_id)`, which changes a recommended action's status to `completed`.

Example:

```sql
CALL complete_recommended_action(3);
```

The documented test using action ID 3 completed successfully.

### 9.4 Testing Results

| Feature | Documented result |
|---|---|
| Crop-count function | Successful |
| Stored procedure | Successful |
| Status-change trigger | Successful |
| Audit log | Successfully recorded |

These database features demonstrate how PostgreSQL can automate operations and maintain an audit history.

Refer to `function-triggers.sql` for the implementation and test examples.

## 10. Relationship with the AgriPilot Application

PostgreSQL is the database used by the running AgriPilot application.

The application follows a client-server architecture:

1. The React frontend sends requests to the Express backend.
2. The backend processes requests and applies application logic.
3. The backend communicates with PostgreSQL using the `pg` library.
4. PostgreSQL stores and retrieves the requested application data.
5. The backend returns responses to the frontend.

The database supports the application's main functionality, including:

- User authentication and account management
- Farm management
- Crop management
- Crop health monitoring
- Recommended agricultural actions
- Action completion and history
- Fertilizer transaction records

This integration allows agricultural records to be stored persistently in a relational database.

## 11. Testing

Database testing was conducted using PostgreSQL and pgAdmin 4.

Testing covered:

- Table creation and relationships
- Data insertion and retrieval
- SQL queries and joins
- Aggregate functions
- Database normalisation examples
- Index creation and query performance
- Transaction commit and rollback
- User-defined functions
- Stored procedures
- Database triggers and audit logging

Application testing also covered the use of PostgreSQL-backed features, including farm creation, crop registration, crop health observations, recommended actions and data persistence after refreshing and logging in again.

## 12. Project Files

The database component is organised as follows:

```text
database/
├── schema.sql
├── seed.sql
├── queries.sql
├── normalisation.sql
├── relational-algebra.sql
├── indexes.sql
├── transactions.sql
├── function-triggers.sql
├── README.md
└── diagrams/
    ├── system-architecture.md
    └── er-diagram.md
```

The SQL files contain the database schema, sample data, queries and assessment examples.

## 13. Database Configuration

The backend connects to PostgreSQL using environment variables.

The main configuration values include:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=agripilot_db
PGUSER=your_postgres_username
PGPASSWORD=your_postgres_password
```

The PostgreSQL connection is configured in the backend through `backend/src/config/postgres.js`.

Database credentials are kept in environment variables and should not be committed to GitHub.

## 14. Future Development

Future improvements may include:

- Deploying the PostgreSQL database using a managed cloud database service.
- Deploying the backend and frontend using Render.
- Improving database query performance for larger datasets.
- Expanding database reporting and analytics.
- Improving production monitoring and backup procedures.
- Extending agricultural data management and recommendation features.

## 15. Conclusion

AgriPilot uses PostgreSQL as its primary relational database to store and manage agricultural information.

The database supports the application's farm management, crop management, crop health monitoring, recommended actions and transaction functionality.

The project also demonstrates important database concepts through schema design, normalisation, SQL operations, relational algebra, indexing, transactions, functions, triggers and stored procedures.

By integrating PostgreSQL with the Node.js and Express backend, AgriPilot provides a practical example of how relational database technology can support a digital agricultural management system.