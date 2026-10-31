# AgriPilot System Architecture

## 1. System Overview

AgriPilot is an agricultural management system designed to help farmers manage farms, monitor crops, record care activities and organise recommended actions.

The system uses a React frontend, a Node.js and Express backend, and MongoDB as its current application database.

A separate PostgreSQL database has been developed for the database assessment component.

## 2. Current Development Architecture

The following diagram illustrates the architecture of the existing AgriPilot application.


flowchart TD
    A[Farmer] --> B[React Frontend]
    B -->|HTTP Requests| C[Node.js and Express API]
    C --> D[Authentication Middleware]
    D --> E[Routes and Controllers]
    E --> F[Business Logic]
    F --> G[(MongoDB)]
    G -->|Database Results| F
    F -->|JSON Response| B
    B --> A


### Explanation

- **Farmer:** Uses the application to manage farm information and interact with its features.
- **React Frontend:** Provides the user interface.
- **Node.js and Express API:** Receives and processes frontend requests.
- **Authentication Middleware:** Verifies user authentication using JWT.
- **Routes and Controllers:** Direct requests to the appropriate backend operations.
- **Business Logic:** Handles application operations and processing.
- **MongoDB:** Stores the application's data.

The backend returns responses to the frontend in JSON format.

## 3. PostgreSQL Database Assessment Architecture

The PostgreSQL database is currently a separate assessment and learning component.

It was created and tested using PostgreSQL and pgAdmin 4.

The assessment database contains six main relational tables:

- Users
- Farms
- Crops
- Care Activities
- Recommended Actions
- Action Completions

It also contains an additional `action_status_log` audit table used by the database trigger.

The current PostgreSQL database is not connected to the running React and Node.js application.


flowchart TD
    A[Database Assessment]
    A --> B[pgAdmin 4]
    B --> C[(PostgreSQL Database)]
    C --> D[Users]
    C --> E[Farms]
    C --> F[Crops]
    C --> G[Care Activities]
    C --> H[Recommended Actions]
    C --> I[Action Completions]
    C --> J[Action Status Log]


## 4. Proposed PostgreSQL Integration

In a future development stage, PostgreSQL could be integrated into AgriPilot as an alternative relational database.

The proposed architecture uses Prisma ORM to connect the Node.js and Express backend to PostgreSQL.


flowchart TD
    A[Farmer] --> B[React Frontend]
    B -->|HTTP Requests| C[Node.js and Express API]
    C --> D[Authentication and Backend Logic]
    D --> E[Prisma ORM]
    E --> F[(PostgreSQL Database)]
    F --> G[Users]
    F --> H[Farms]
    F --> I[Crops]
    F --> J[Care Activities]
    F --> K[Recommended Actions]
    F --> L[Action Completions]
    F --> M[Action Status Log]
    F -->|Query Results| E
    E -->|Data| D
    D -->|JSON Response| B


### Explanation

- React provides the frontend interface.
- Node.js and Express handle API requests.
- Backend logic processes application operations.
- Prisma ORM provides communication between the backend and PostgreSQL.
- PostgreSQL stores and manages relational data.
- The backend returns the processed results to the React frontend.

This is a proposed architecture and has not yet been implemented.

## 5. Conclusion

AgriPilot currently uses a React frontend, Node.js and Express backend, and MongoDB database.

The separate PostgreSQL assessment demonstrates relational database design, SQL operations, normalisation, indexing, transactions, functions, triggers and stored procedures.

The proposed PostgreSQL architecture illustrates how the relational database could be integrated into the application in the future using Prisma ORM.
