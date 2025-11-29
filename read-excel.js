import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const filePath = path.join(__dirname, 'attached_assets', 'NDIS - EmpowerLinkServices_1764110951129.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('=== EXCEL FILE STRUCTURE ===\n');
console.log('Sheet Names:', workbook.SheetNames);
console.log('');

// For each sheet, show its structure and first few rows
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n=== SHEET ${index + 1}: ${sheetName} ===\n`);

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`Total Rows: ${jsonData.length}`);

  if (jsonData.length > 0) {
    console.log('\nColumn Headers:', Object.keys(jsonData[0]));
    console.log('\nFirst 5 Rows:\n');
    console.log(JSON.stringify(jsonData.slice(0, 5), null, 2));
  }

  console.log('\n' + '='.repeat(80));
});
