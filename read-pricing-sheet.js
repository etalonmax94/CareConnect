import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const filePath = path.join(__dirname, 'attached_assets', 'NDIS - EmpowerLinkServices_1764110951129.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('=== PRICING SHEET - ALL SERVICES ===\n');

const worksheet = workbook.Sheets['Pricing'];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

console.log(`Total Services: ${jsonData.length}\n`);

jsonData.forEach((row, index) => {
  console.log(`${index + 1}. ${row['Service Name']}`);
  console.log(`   Description: ${row['Description']}`);
  console.log(`   Unit: ${row['Unit']}`);
  console.log(`   Price: $${row['Price (AUD)']}`);
  console.log('');
});

console.log('\n=== HOLIDAYS SHEET - ALL HOLIDAYS ===\n');

const holidaysSheet = workbook.Sheets['Holidays'];
const holidaysData = XLSX.utils.sheet_to_json(holidaysSheet, { defval: '' });

console.log(`Total Holidays: ${holidaysData.length}\n`);

holidaysData.forEach((row, index) => {
  // Excel dates are stored as numbers - convert them
  const excelDate = row['Date'];
  const jsDate = XLSX.SSF.parse_date_code(excelDate);
  const dateStr = `${jsDate.y}-${String(jsDate.m).padStart(2, '0')}-${String(jsDate.d).padStart(2, '0')}`;

  console.log(`${index + 1}. ${dateStr} (${row['Day']}) - ${row['Holiday Name']}`);
  if (row['Notes']) {
    console.log(`   Note: ${row['Notes']}`);
  }
});
