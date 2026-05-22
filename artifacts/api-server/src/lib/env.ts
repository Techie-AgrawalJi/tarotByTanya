import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function getEnvFilePath() {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", ".env"),
    path.resolve(process.cwd(), ".env"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

dotenv.config({ path: getEnvFilePath() });
