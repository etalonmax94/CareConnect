import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
  sheetName?: string;
}

export async function exportToExcel(data: ExportData, filename: string) {
  const workbook = XLSX.utils.book_new();
  
  const worksheetData = [data.headers, ...data.rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  const colWidths = data.headers.map((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...data.rows.map(row => String(row[index] || "").length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet["!cols"] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, data.sheetName || "Report");
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportMultipleSheetsToExcel(
  sheets: Array<{ name: string; data: ExportData }>,
  filename: string
) {
  const workbook = XLSX.utils.book_new();
  
  sheets.forEach(sheet => {
    const worksheetData = [sheet.data.headers, ...sheet.data.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    const colWidths = sheet.data.headers.map((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...sheet.data.rows.map(row => String(row[index] || "").length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet["!cols"] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
  });
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function downloadPDF(pdfComponent: React.ReactElement, filename: string) {
  const blob = await pdf(pdfComponent).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
