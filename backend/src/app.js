require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/postgres");

const authRoutes = require("./routes/authRoutes");
const cropRoutes = require("./routes/cropRoutes");
const userRoutes = require("./routes/userRoutes");
const farmRoutes = require("./routes/farmRoutes");
const cropHealthRoutes = require("./routes/cropHealthRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const cropActionPlannerRoutes = require("./routes/cropActionPlannerRoutes");
const actionCompletionRoutes = require("./routes/actionCompletionRoutes");
const fertilizerTransactionRoutes = require("./routes/fertilizerTransactionRoutes");


const app = express();

app.use(cors());
app.use(express.json());

console.log("authRoutes type:", typeof authRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/users", userRoutes);
app.use("/api/farms", farmRoutes);
app.use("/api/crop-health", cropHealthRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/action-planner", cropActionPlannerRoutes);
app.use("/api/action-completions", actionCompletionRoutes);
app.use("/api/transactions", fertilizerTransactionRoutes);


const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        await pool.query("SELECT 1");
        console.log("PostgreSQL connected successfully");

        app.listen(PORT, () => {
            console.log(`AgriPilot server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("PostgreSQL connection failed:", error.message);
        process.exit(1);
    }
};

startServer();
