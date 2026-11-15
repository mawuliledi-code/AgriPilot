
const { Pool } = require("pg");

const postgresPool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
});

postgresPool.on("connect", () => {
    console.log("PostgreSQL connected successfully");
});

postgresPool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error.message);
});

module.exports = postgresPool;
