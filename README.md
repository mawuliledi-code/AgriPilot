# AgriPilot – Digital Agricultural Management System

## 1. Project Overview

AgriPilot is a web-based agricultural management application designed to support farmers in managing their farms, crops, crop health and agricultural activities.

The system provides a centralized platform for farm management, crop monitoring, weather information and agricultural recommendations.

The application combines modern web development technologies with a PostgreSQL relational database to support the storage, retrieval and management of agricultural data.

This project was developed as part of an academic software development project.

## 2. Project Objectives

The main objectives of AgriPilot are:

- To provide digital management of agricultural farms.
- To simplify crop registration and management.
- To monitor crop health and identify pests and diseases.
- To record crop health observations and treatment information.
- To provide weather information to support agricultural decisions.
- To generate recommendations for agricultural activities.
- To support the tracking and management of recommended actions.
- To store agricultural information in a structured relational database.

## 3. Main Features

### 3.1 User Authentication and Management

- User registration.
- Secure user login.
- Authentication using JSON Web Tokens (JWT).
- Access to individual farm information.

### 3.2 Farm Management

- Creation and management of farms.
- Association of crops with individual farms.
- Management of farm-related information.

### 3.3 Crop Management

- Adding new crops.
- Viewing and editing crop information.
- Monitoring crop development and status.
- Accessing crop-specific information.

### 3.4 Crop Health Monitoring

- Recording pest infestations and plant diseases.
- Assigning severity levels to health observations.
- Recording symptoms, notes and treatment information.
- Editing existing health observations.
- Displaying crop health alerts.
- Identifying crops that require attention.

### 3.5 Weather Information

- Retrieving and displaying weather information.
- Providing weather-related information to support agricultural planning.

### 3.6 Recommendations and Action Planning

- Generating agricultural recommendations.
- Displaying recommended actions.
- Tracking pending and completed recommendations.
- Recording completed activities.

### 3.7 Action History

- Displaying previously completed actions.
- Tracking action status and completion information.
- Maintaining a record of agricultural activities.

### 3.8 Fertilizer Transactions

- Recording fertilizer-related transactions.
- Storing and managing transaction information.

## 4. Technologies Used

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend Build Tool | Vite |
| Programming Language | JavaScript |
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | PostgreSQL |
| Database Driver | node-postgres (pg) |
| Authentication | JSON Web Token (JWT) |
| Password Hashing | bcryptjs |
| API Architecture | REST API |
| Version Control | Git |

## 5. Project Structure

```text
AgriPilot/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── app.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── ...
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── database/
│   ├── README.md
│   ├── schema.sql
│   ├── seed.sql
│   ├── queries.sql
│   ├── normalisation.sql
│   ├── transactions.sql
│   ├── function-triggers.sql
│   ├── relational-algebra.sql
│   ├── indexes.sql
│   └── diagrams/
│
└── README.md
```

## 6. System Requirements

The following software is required to run AgriPilot:

- Node.js
- npm (Node Package Manager)
- PostgreSQL
- Git (optional, for cloning the repository)

## 7. Installation and Setup

### 7.1 Obtain the Project

Open a terminal and navigate to the project directory:

```bash
cd AgriPilot
```

### 7.2 Backend Setup

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory and configure the required environment variables:

```env
PORT=3000

PGHOST=localhost
PGPORT=5432
PGDATABASE=agripilot
PGUSER=postgres
PGPASSWORD=YOUR_POSTGRESQL_PASSWORD

JWT_SECRET=YOUR_SECRET_KEY
```

Replace the example values with the credentials and configuration used by your local environment.

Additional environment variables, such as those required by external weather services, should be configured according to the backend implementation.

**Security note:** The `.env` file contains sensitive information and must not be committed to a public Git repository.

### 7.3 PostgreSQL Database Setup

1. Start the PostgreSQL server.
2. Create a database named `agripilot`, or use the database name configured in the environment variables.
3. Execute the SQL files located in the `database/` directory in the appropriate order.
4. Verify that the database schema and required tables have been created successfully.

For detailed database documentation, refer to:

`database/README.md`

### 7.4 Start the Backend

From the `backend/` directory, run:

```bash
npm run dev
```

The backend uses port `3000` by default unless another port is specified in the `.env` file.

### 7.5 Frontend Setup

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Open the local URL displayed by Vite in your web browser.

## 8. Database Architecture

AgriPilot uses PostgreSQL as its relational database management system.

The database supports the storage and management of application information, including:

- Users
- Farms
- Crops
- Crop health observations
- Recommended actions
- Action completion records
- Agricultural transactions

The database component also includes SQL scripts and documentation covering:

- Database schema design.
- Database normalization.
- SQL queries and operations.
- Relational algebra.
- Indexing.
- Transactions and ACID properties.
- Database functions and triggers.

Further details are provided in `database/README.md`.

## 9. Backend and REST API

The backend is developed using Node.js and Express.js.

It provides REST API endpoints that allow the frontend to communicate with the database and application services.

The main API routes include:

| API Endpoint | Purpose |
|---|---|
| `/api/auth` | User authentication |
| `/api/users` | User management |
| `/api/farms` | Farm management |
| `/api/crops` | Crop management |
| `/api/crop-health` | Crop health observations |
| `/api/weather` | Weather information |
| `/api/action-planner` | Agricultural recommendations |
| `/api/action-completions` | Action completion records |
| `/api/transactions` | Fertilizer transactions |

## 10. Security Considerations

AgriPilot implements several basic security measures:

- JWT-based user authentication.
- Password hashing using bcryptjs.
- Protected API routes.
- User-specific data access controls.
- Environment variables for sensitive configuration values.

## 11. Testing and Quality Assurance

The following application features have been manually tested during development:

- User registration and login.
- Farm creation and management.
- Crop registration and management.
- Recording and editing crop health observations.
- Displaying pest and disease alerts.
- Generating agricultural recommendations.
- Completing recommended actions.
- Viewing action history.
- Retrieving weather information.
- Data persistence after logout and subsequent login.

The frontend production build has also been successfully tested.

## 12. Academic Context

AgriPilot demonstrates the practical application of modern web development technologies to address challenges in agricultural management.

The project integrates frontend development, backend programming, REST API communication and relational database management into a single application.

It also demonstrates the use of database concepts such as normalization, relational operations, indexing, transactions and database functions.

The project provides an example of how digital technologies can support agricultural monitoring, farm organization and decision-making.

## 13. Project Information

**Project Name:** AgriPilot  
**Project Type:** Academic Software Development Project  
**Project Domain:** Agriculture and Information Technology  
**Frontend:** React and Vite  
**Backend:** Node.js and Express.js  
**Database:** PostgreSQL  
**Project Status:** Development and Testing

---

*AgriPilot – Supporting Smarter and More Efficient Agriculture Through Digital Technology.*