import fs from "fs";
const env = fs.readFileSync(".env", "utf8");
env.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length)
    process.env[key.trim()] = vals
      .join("=")
      .trim()
      .replace(/^"|"$/g, "");
});
import { knowledgeService } from "./src/services/knowledgeService.server.ts";
async function run() {
  const r = await knowledgeService.searchKnowledge("hiệu trưởng trường có thông tin trong này không");
  console.log("RESULT 1:");
  console.log(JSON.stringify(r, null, 2));

  const r2 = await knowledgeService.searchKnowledge("Hiệu trưởng là ai");
  console.log("RESULT 2:");
  console.log(JSON.stringify(r2, null, 2));
}
run();
