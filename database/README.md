# AgriPilot – PostgreSQL Database Assessment

## 1. Project Overview

AgriPilot is an agricultural management system designed to help farmers manage farms, monitor crops, record care activities and organise recommended actions.

This database component uses PostgreSQL to demonstrate relational database design, SQL operations and database management concepts.

**Important:** PostgreSQL is currently a separate assessment component. The existing AgriPilot application uses MongoDB. PostgreSQL integration with the running application is planned as a future development step.

## 2. Technologies Used

- **PostgreSQL** – Relational database management system
- **pgAdmin 4** – Database administration and SQL query tool
- **SQL** – Database definition and manipulation language
- **Visual Studio Code** – SQL documentation and project files
- **Node.js and Express** – Existing AgriPilot backend
- **React** – Existing AgriPilot frontend
- **MongoDB** – Existing application database

## 3. Database Structure

The PostgreSQL database is named `agripilot_db`.

It contains six main tables:

| Table | Purpose |
|---|---|
| `users` | Stores farmer account information |
| `farms` | Stores farms belonging to users |
| `crops` | Stores crops belonging to farms |
| `care_activities` | Records crop maintenance activities |
| `recommended_actions` | Stores recommended farm and crop actions |
| `action_completions` | Records completed recommended actions |

## 4. Database Relationships

The database contains the following relationships:

- One user can own multiple farms.
- One farm can contain multiple crops.
- One crop can have multiple care activities.
- One farm can have multiple recommended actions.
- A recommended action can optionally relate to a crop.
- One recommended action can have multiple completion records.

Primary keys uniquely identify records. Foreign keys connect related tables and help maintain referential integrity.

See `diagrams/er-diagram.md` for the Entity Relationship Diagram.

## 5. Normalisation

The database design separates users, farms, crops, care activities and actions into related tables.

The normalisation documentation discusses:

- First Normal Form (1NF)
- Second Normal Form (2NF)
- Third Normal Form (3NF)

The purpose of normalisation is to reduce unnecessary data duplication and improve data consistency.

See `normalisation.sql` for the explanations and examples.

## 6. SQL Operations Demonstrated

The project documents and demonstrates the following SQL operations:

- `CREATE TABLE`
- `INSERT`
- `SELECT`
- `UPDATE`
- `WHERE`
- `ORDER BY`
- `LIMIT`
- `DISTINCT`
- `JOIN`
- `GROUP BY`
- `COUNT`, `SUM`, `AVG`, `MIN` and `MAX`
- `UNION`

See `queries.sql` and `relational-algebra.sql` for examples.

## 7. Indexing and Query Performance

The project includes indexes on frequently used foreign-key and search columns to improve data retrieval.

The following areas are indexed:

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

The observed execution time decreased in this test. Actual execution times can vary depending on database cache, system load and other conditions.

Indexes can improve retrieval performance, although they also require storage and can add overhead to data modifications.

See `indexes.sql` for the index definitions and performance experiment.

## 8. Transactions and ACID

The project demonstrates PostgreSQL transaction operations:

- `BEGIN`
- `COMMIT`
- `ROLLBACK`

It also explains the four ACID properties:

- **Atomicity** – A transaction is completed entirely or rolled back.
- **Consistency** – A transaction maintains database rules and constraints.
- **Isolation** – Concurrent transactions are controlled to prevent unwanted interference.
- **Durability** – Committed changes are preserved.

A transaction test was performed using a recommended action. The action status was updated and committed successfully. A separate rollback test confirmed that an uncommitted change could be reversed.

See `transactions.sql` for the examples and test documentation.

## 9. Advanced Database Features

AgriPilot uses PostgreSQL functions, triggers and stored procedures to support database operations and maintain an audit history.

### 9.1 User-Defined Function

The function `count_farm_crops(p_farm_id)` counts the number of crops registered under a particular farm.

Example:

```sql
SELECT count_farm_crops(1);
```

**Test result:** The function returned `2`, confirming that farm 1 contains two crop records.

### 9.2 Database Trigger

The trigger `trg_action_completed` automatically records a status change when a recommended action becomes completed.

It stores:

- Action ID
- Previous status
- New status
- Date and time of the change

The trigger writes this information into the `action_status_log` audit table.

### 9.3 Stored Procedure

The procedure `complete_recommended_action(p_action_id)` changes a recommended action's status to `completed`.

Example:

sql
CALL complete_recommended_action(3);


The procedure was tested successfully using action ID 3.

### 9.4 Testing Results

| Feature | Test result |
|---|---|
| Crop-count function | Successful |
| Stored procedure | Successful |
| Status-change trigger | Successful |
| Audit log | Successfully recorded |

The audit log confirmed that action 3 changed from `pending` to `completed`.

These features demonstrate how PostgreSQL can automate database operations and maintain a record of important changes in AgriPilot.

See `functions-triggers.sql` for the implementation and test examples.

## 10. Project Files

The PostgreSQL assessment component is organised as follows:

text
database/
├── schema.sql
├── seed.sql
├── queries.sql
├── normalisation.sql
├── relational-algebra.sql
├── indexes.sql
├── transactions.sql
├── functions-triggers.sql
├── README.md
└── diagrams/
    ├── system-architecture.md
    └── er-diagram.md


## 11. Testing

The SQL statements were tested using pgAdmin 4 and the `agripilot_db` database.

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

Successful execution messages and query results were used to verify the tested operations.

## 12. Future Development

Future development may include:

- Connecting PostgreSQL to the Node.js backend using an ORM such as Prisma.
- Integrating relational data into the React application.
- Replacing or migrating selected MongoDB functionality.
- Testing query performance with larger datasets.
- Exploring database scaling and advanced transaction handling.

## 13. Conclusion

The AgriPilot PostgreSQL component provides a practical demonstration of relational database concepts through an agricultural management use case.

It combines database design, SQL operations, normalisation, relational algebra, indexing, transactions, functions, triggers and stored procedures.

The project demonstrates how a relational database can organise agricultural information, maintain relationships between records, automate operations and preserve an audit history.

