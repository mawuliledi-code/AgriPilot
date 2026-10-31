require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDatabase = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const cropRoutes = require("./routes/cropRoutes");
const userRoutes = require("./routes/userRoutes");
const farmRoutes = require("./routes/farmRoutes");
const cropHealthRoutes = require("./routes/cropHealthRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const cropActionPlannerRoutes = require("./routes/cropActionPlannerRoutes");
const actionCompletionRoutes = require("./routes/actionCompletionRoutes");


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



app.get("/", (req, res) => {
    res.json({
        message: "AgriPilot API is running"
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`AgriPilot server running on port ${PORT}`);
    });
};

startServer();
