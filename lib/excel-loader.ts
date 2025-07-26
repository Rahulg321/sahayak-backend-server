import * as XLSX from "xlsx";

export class ExcelLoader {
  async loadFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error("No sheets found in Excel file");
      }
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new Error("Sheet not found");
      }
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      //   console.log("jsonData", jsonData);
      return JSON.stringify(jsonData);
    } catch (error) {
      console.error("Error parsing Excel:", error);
      throw new Error("Failed to parse Excel file");
    }
  }
  async loadExcelFromBuffer(buffer: Buffer) {
    // Read workbook
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheets: Record<string, any[]> = {};

    workbook.SheetNames.forEach((name) => {
      // Convert each sheet to an array of row objects
      const worksheet = workbook.Sheets[name];
      if (worksheet) {
        sheets[name] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // returns rows as arrays of cells
          defval: "", // fill empty cells with empty string
        });
      }
    });

    return sheets;
  }
}

export default ExcelLoader;
