
const { Pool } = require("pg");

console.log("Backend PGUSER:", process.env.PGUSER);

const postgresPool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
});

postgresPool.on("connect", async (client) => {
    console.log("PostgreSQL connected successfully");

    try {
        const result = await client.query(
            "SELECT current_database(), current_user, current_schema(), current_setting('search_path')"
        );

        console.log("Database check:", result.rows[0]);
    } catch (error) {
        console.error("Database check failed:", error.message);
    }
});

postgresPool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error.message);
});

module.exports = postgresPool;
