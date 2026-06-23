import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter: adapter,
  log: ["query", "info", "warn", "error"],
  errorFormat: "pretty",
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  pool.end(() => {
    console.log("Database connection closed");
    process.exit(0);
  });
});

export default prisma;
