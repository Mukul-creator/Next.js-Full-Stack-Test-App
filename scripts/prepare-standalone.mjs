import fs from "fs";
import path from "path";

const srcStatic = path.join(".next", "static");
const destStatic = path.join(".next", "standalone", ".next", "static");

// Ensure static files are copied into standalone
if (fs.existsSync(srcStatic)) {
  fs.mkdirSync(destStatic, { recursive: true });
  fs.cpSync(srcStatic, destStatic, { recursive: true, force: true });
  console.log("> Successfully synced .next/static into .next/standalone/.next/static");
}

// Copy public directory if it exists
if (fs.existsSync("public")) {
  const destPublic = path.join(".next", "standalone", "public");
  fs.mkdirSync(destPublic, { recursive: true });
  fs.cpSync("public", destPublic, { recursive: true, force: true });
  console.log("> Successfully synced public/ into .next/standalone/public");
}

