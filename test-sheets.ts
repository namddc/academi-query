import { googleSheetsService } from "./src/services/googleSheetsService.server.ts";
const rows = googleSheetsService.getAllRows();
console.log(`Successfully loaded ${rows.length} rows.`);
