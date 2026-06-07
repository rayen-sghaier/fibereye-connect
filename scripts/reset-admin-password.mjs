import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const password = process.argv[2] || process.env.ADMIN_PASSWORD;
const dbFile = resolve("data", "db.json");

if (!password || password.trim().length < 4) {
  console.error("Usage: npm run admin:reset -- nouveau-code");
  process.exit(1);
}

async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(value, salt, 64);
  return {
    salt,
    passwordHash: derived.toString("hex")
  };
}

try {
  const db = JSON.parse(await readFile(dbFile, "utf8"));
  db.admin = await hashPassword(password.trim());
  db.updatedAt = new Date().toISOString();
  await writeFile(dbFile, JSON.stringify(db, null, 2), "utf8");
  console.log("Code admin mis à jour.");
} catch (error) {
  console.error(
    error.code === "ENOENT"
      ? "data/db.json introuvable. Lancez d'abord npm run start une fois."
      : error.message
  );
  process.exit(1);
}
