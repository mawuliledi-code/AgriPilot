# AgriPilot – Smart Farm Management System

## 1. Project Overview

AgriPilot is a web-based Smart Farm Management System designed to help farmers manage their farms, monitor crop health, access weather information, and organize farming activities.

The system provides a centralized platform where farmers can manage farm information, track crops, receive recommended farming actions, and record completed activities.

AgriPilot aims to support better farm organization and informed agricultural decision-making through digital technology.

## 2. Project Objectives

The main objectives of AgriPilot are to:

- Provide a platform for farmers to manage their farm information.
- Allow farmers to register and manage their crops.
- Support crop health monitoring.
- Provide current weather information and weather forecasts.
- Generate recommended farming actions.
- Allow farmers to track completed farming activities.
- Manage fertilizer transactions.
- Store and organize farm-related information in a relational database.

## 3. Main Features

### 3.1 User Authentication
- Farmer registration and login.
- Password hashing for improved security.
- JWT-based authentication.
- Protected application routes.

### 3.2 Farm Management
- Create and manage farm records.
- Store farm names, locations, sizes, and crop information.
- Store farm coordinates for location-based weather information.

### 3.3 Crop Management
- Add and manage crops.
- Store crop information and growing periods.
- Record common pests and diseases.
- Store irrigation, fertilizer, and pesticide information.

### 3.4 Crop Health Monitoring
- Record crop health observations.
- Track pests, diseases, symptoms, and severity.
- Record treatments and notes.

### 3.5 Weather Information
- Display current weather information.
- Provide a three-day weather forecast.
- Retrieve weather information using farm coordinates.
- Integrate with WeatherAPI for weather data.

### 3.6 Recommendations and Action Planning
- Display recommended farming actions.
- Help farmers organize farm activities.
- Track farming actions and their completion status.

### 3.7 Action History
- Record completed farming activities.
- Store action descriptions, outcomes, notes, and completion dates.
- Maintain a history of farming activities.

### 3.8 Fertilizer Transactions
- Support the recording and management of fertilizer transaction information.

## 4. Technologies Used

### Frontend
- React.js
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- REST API

### Database
- PostgreSQL
- Node PostgreSQL (`pg`)

### Security
- JSON Web Token (JWT)
- bcryptjs for password hashing

### External Services
- WeatherAPI for current weather information and forecasts.
- Open-Meteo Geocoding for farm location coordinates.

### Deployment
- Render for frontend hosting.
- Render for backend hosting.
- Render PostgreSQL for database hosting.

## 5. Project Structure

The project is organized into three main directories:

```text
AgriPilot/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── app.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
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
├── .gitignore
└── README.md
```

## 6. System Requirements

To run AgriPilot locally, the following software is required:

- Node.js
- npm
- PostgreSQL
- Git
- A modern web browser

## 7. Installation and Setup

### 7.1 Clone the Repository

```bash
git clone https://github.com/mawuliledi-code/AgriPilot.git
cd AgriPilot
```

### 7.2 Backend Setup

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory and configure the following environment variables using your own local database credentials:

```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=agripilot_db
PGUSER=your_postgres_username
PGPASSWORD=your_postgres_password
JWT_SECRET=your_secret_key
WEATHERAPI_KEY=your_weatherapi_key
```

Start the backend development server:

```bash
npm run dev
```

### 7.3 Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000
```

Start the frontend development server:

```bash
npm run dev
```

Open the local URL provided by Vite in your browser.

**Note:** Never commit `.env` files or publish passwords, API keys, JWT secrets, or other credentials to GitHub.

## 8. Database Architecture

AgriPilot uses PostgreSQL as its relational database management system.

The database stores and manages information related to:

- Users
- Farms
- Crops
- Care activities
- Recommended actions
- Action completions
- Crop health observations
- Farmer action completions
- Fertilizer transactions

The database implementation includes relational tables, primary keys, foreign keys, constraints, indexes, SQL queries, functions, triggers, and procedures.

The database scripts are available in the `database/` directory.

## 9. Backend REST API

The backend provides REST API endpoints for communication between the frontend and database.

The main API route groups include:

| Route | Description |
|---|---|
| `/api/auth` | User registration and authentication |
| `/api/users` | User-related operations |
| `/api/farms` | Farm management |
| `/api/crops` | Crop management |
| `/api/crop-health` | Crop health observations |
| `/api/weather` | Weather information |
| `/api/action-planner` | Recommended farming actions |
| `/api/action-completions` | Completed farming activities |
| `/api/transactions` | Fertilizer transactions |

## 10. Deployment

AgriPilot is deployed using Render.

The deployed system consists of three main services:

### Frontend
- Hosting type: Render Static Site
- Build directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`

### Backend
- Hosting type: Render Web Service
- Application: Node.js and Express
- Start command: `node src/app.js`

### Database
- Hosting type: Render PostgreSQL
- Database name: `agripilot_db`

### Weather Integration
- Provider: WeatherAPI
- Used to retrieve current weather information and a three-day forecast.

### Live Application

**AgriPilot Website:**  
https://agripilot-frontend.onrender.com

**GitHub Repository:**  
https://github.com/mawuliledi-code/AgriPilot

## 11. Security Considerations

The system includes security measures such as:

- Password hashing using bcryptjs.
- JWT-based authentication.
- Protected backend routes.
- Environment variables for sensitive configuration.
- Database credentials stored outside the source code.

API keys, passwords, database credentials, and JWT secrets should not be committed to the public repository.

## 12. Testing and Quality Assurance

The application has been tested through development and deployment activities, including:

- User registration and login.
- Backend and database connectivity.
- Farm creation and management.
- Frontend and backend communication.
- Weather information retrieval.
- Weather forecast display.

Further testing can be carried out to evaluate additional features and improve application reliability.

## 13. Academic Context

AgriPilot was developed as an academic software development project.

The project demonstrates the application of concepts in:

- Web application development.
- Frontend and backend integration.
- REST API development.
- Relational database design and management.
- SQL queries and database operations.
- User authentication and application security.
- External API integration.
- Cloud application deployment.

## 14. Project Information

| Item | Details |
|---|---|
| Project Name | AgriPilot |
| Project Type | Web-Based Application |
| Application Domain | Agriculture |
| Frontend | React.js and Vite |
| Backend | Node.js and Express.js |
| Database | PostgreSQL |
| Weather Service | WeatherAPI |
| Hosting Platform | Render |
| Project Status | Developed and Deployed |

---

**AgriPilot – Smart Farm Management System**  
A digital platform designed to support farm management and agricultural decision-making.