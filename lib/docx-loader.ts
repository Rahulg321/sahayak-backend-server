import mammoth from "mammoth";

export class DocxLoader {
  async loadFromBuffer(buffer: Buffer): Promise<string> {
    try {
      console.log("inside mammoth");
      console.log("buffer type:", typeof buffer);
      console.log("buffer instanceof Buffer:", buffer instanceof Buffer);
      console.log("buffer length:", buffer.length);

      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value; // This is the extracted plain text
    } catch (error) {
      console.error("Error parsing DOCX:", error);
      throw new Error("Failed to parse DOCX file");
    }
  }
}
