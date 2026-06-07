import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const dataDir = resolve("data");
const uploadsDir = resolve(dataDir, "uploads");
const backupsDir = resolve(dataDir, "backups");
const dbFile = resolve(dataDir, "db.json");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupName = `fibereye-backup-${stamp}`;
const backupPath = resolve(backupsDir, backupName);

try {
  await mkdir(backupPath, { recursive: true });
  const db = await readFile(dbFile, "utf8");
  await writeFile(resolve(backupPath, "db.json"), db, "utf8");

  const uploadsInfo = await stat(uploadsDir).catch(() => null);
  if (uploadsInfo?.isDirectory()) {
    await cp(uploadsDir, resolve(backupPath, "uploads"), {
      recursive: true,
      errorOnExist: false,
      force: true
    });
  }

  console.log(`Backup créé: data/backups/${backupName}`);
} catch (error) {
  console.error(
    error.code === "ENOENT"
      ? "data/db.json introuvable. Lancez d'abord npm run start une fois."
      : error.message
  );
  process.exit(1);
}
