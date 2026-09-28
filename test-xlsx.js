const xlsx = require('xlsx');
try {
  console.log("Reading...");
  const workbook = xlsx.readFile('src/Database/ibot_faq_100.xlsx');
  console.log("Success! Sheets:", workbook.SheetNames);
} catch(e) {
  console.error("Failed:", e);
}
