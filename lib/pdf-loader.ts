// @ts-ignore
import pdfParse from "pdf-parse";

export class PDFLoader {
  /**
   * @param buffer Buffer of PDF file
   * @returns the full text content
   */
  async loadFromBuffer(buffer: Buffer): Promise<string> {
    try {
      // Parse PDF to get text
      const data = await pdfParse(buffer);
      return data.text; // All extracted text, pages concatenated
    } catch (error) {
      console.error("Error parsing PDF:", error);
      throw new Error("Failed to parse PDF file");
    }
  }
}
