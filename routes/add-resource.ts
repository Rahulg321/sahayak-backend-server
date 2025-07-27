import { Router, type Request, type Response } from "express";
import authenticateToken from "../middleware/authenticate-token";
import { put } from "@vercel/blob";
import { embeddings as embeddingsTable, resources } from "../lib/db/schema";
import multer from "multer";
import { PDFLoader } from "../lib/pdf-loader";
import { googleAISDKProvider, googleGenAIProvider } from "../lib/ai/providers";
import ExcelLoader from "../lib/excel-loader";
import { DocxLoader } from "../lib/docx-loader";
import { processLargePdfURL } from "../lib/ai/process-pdf-url";
import {
  generateChunksFromText,
  generateEmbeddingsFromChunks,
} from "../lib/ai/embedding";
import { db } from "../lib/db/queries";
import { generateText } from "ai";

const upload = multer({
  storage: multer.memoryStorage(),
});

const router = Router();

router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  console.log("inside api add resource");

  const file = req.file;
  const name = req.body.name as string;
  const description = req.body.description as string;
  const subjectId = req.body.subjectId as string;

  if (!file) {
    throw new Error("No file provided");
  }

  if (!name) {
    throw new Error("No name provided");
  }

  if (!description) {
    throw new Error("No description provided");
  }

  if (!subjectId) {
    throw new Error("No subject ID provided");
  }

  // Get file type
  const fileType = file.mimetype;
  const buffer = file.buffer;
  const fileName = file.filename;

  console.log("file type", fileType);

  let content: string = "";
  let sheets: Record<string, any[][]> | undefined;
  let chunks: any;
  let embeddingInput: string[];
  let kind: string = "";

  let fileUploadedUrl = "";

  try {
    const data = await put(`${fileName}`, buffer, {
      access: "public",
      allowOverwrite: true,
    });

    fileUploadedUrl = data.url;
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Error uploading file to Vercel Blob",
    });
  }

  console.log("file was successfully uploaded to vercel blob", fileUploadedUrl);

  if (fileType === "application/pdf") {
    const pdfLoader = new PDFLoader();
    const rawContent = await pdfLoader.loadFromBuffer(buffer);

    let responseText = "No analysis available";

    console.log("analysing pdf using AI");

    //   responseText = await processLargePdfURL(fileUploadedUrl, fileName);

    try {
      const result = await generateText({
        model: googleAISDKProvider("gemini-1.5-flash"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What is an embedding model according to this document?",
              },
              {
                type: "file",
                data: buffer,
                mimeType: "application/pdf",
              },
            ],
          },
        ],
      });

      console.log(result.text);

      responseText = result.text as string;
    } catch (error) {
      console.log("error analysing pdf using AI");
      console.log(error);
    }

    // Combine raw content with AI summary
    content = `Name: ${name}\nDescription: ${description}\n\n Original Content:\n\n${rawContent}\n\nAI Analysis:\n\n${responseText}`;
    kind = "pdf";
  } else if (
    fileType === "application/vnd.ms-excel" ||
    fileType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    console.log("=== Processing Excel file ===");
    const excelLoader = new ExcelLoader();
    sheets = await excelLoader.loadExcelFromBuffer(buffer);
    console.log("Excel sheets loaded:", Object.keys(sheets));

    // Filter out empty rows and create meaningful content
    const excelContent = Object.entries(sheets)
      .map(([sheetName, rows]) => {
        console.log(
          `Processing sheet: ${sheetName}, Total rows: ${rows.length}`
        );

        // Filter out completely empty rows
        const nonEmptyRows = rows.filter((row) =>
          row.some(
            (cell) =>
              cell !== null && cell !== undefined && String(cell).trim() !== ""
          )
        );

        console.log(
          `Sheet ${sheetName}: ${nonEmptyRows.length} non-empty rows out of ${rows.length} total`
        );

        if (nonEmptyRows.length === 0) {
          return `Sheet: ${sheetName}\n(Empty sheet)`;
        }

        return `Sheet: ${sheetName}\n${nonEmptyRows
          .map((row, idx) => `Row ${idx + 1}: ${row.map(String).join(" | ")}`)
          .join("\n")}`;
      })
      .filter((content) => !content.includes("(Empty sheet)"))
      .join("\n\n");

    console.log("Excel content length:", excelContent.length);
    console.log(
      "Excel content preview (first 500 chars):",
      excelContent.substring(0, 500)
    );

    // Create content without AI analysis for Excel
    content = `Name: ${name}\nDescription: ${description}\n\n Original Content:\n\n${excelContent}`;
    kind = "excel";

    console.log("Final Excel content length:", content.length);
    console.log(
      "Final Excel content preview (first 500 chars):",
      content.substring(0, 500)
    );
  } else if (fileType === "application/msword") {
    throw new Error(
      "We do not support .doc files. Please upload a .docx file instead."
    );
  } else if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    console.log("=== Processing DOCX file ===");
    const docxLoader = new DocxLoader();
    const rawContent = await docxLoader.loadFromBuffer(buffer);
    console.log("DOCX raw content length:", rawContent.length);

    let aiResponseText;

    console.log("analysing docx using AI");
    const responseText = await processLargePdfURL(fileUploadedUrl, fileName);
    aiResponseText = responseText;

    // Combine raw content with AI summary
    content = `Name: ${name}\nDescription: ${description}\n\n Original Content:\n\n${rawContent}\n\nAI Analysis:\n\n${aiResponseText}`;
    kind = "docx";

    console.log("Final DOCX content length:", content.length);
  } else if (fileType === "image/png" || fileType === "image/jpeg") {
    console.log("=== Processing Image file ===");

    let aiResponseText = "No Analaysis";

    try {
      const imageUrl = fileUploadedUrl;
      const response = await fetch(imageUrl);
      const imageArrayBuffer = await response.arrayBuffer();
      const base64ImageData = Buffer.from(imageArrayBuffer).toString("base64");

      const result = await googleGenAIProvider.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64ImageData,
            },
          },
          { text: "Caption this image." },
        ],
      });

      console.log(result.text);
      aiResponseText = result.text || "No analysis available";
    } catch (error) {
      console.error("error analysing image", error);
    }

    content = `Name: ${name}\nDescription: ${description}\n\n Original AI Analysis:\n\n${aiResponseText}`;
    console.log("Result of analysing image using AI", aiResponseText);
    kind = "image";
    console.log("Final Image content length:", content.length);
  } else if (fileType === "text/plain") {
    console.log("=== Processing Text file ===");
    const textContent = await file.buffer.toString();
    console.log("Text content length:", textContent.length);
    content = `Name: ${name}\nDescription: ${description}\n\n Original Content:\n\n${textContent}\n\n`;
    kind = "txt";
    console.log("Final Text content length:", content.length);
  } else {
    throw new Error("Unsupported file type");
  }

  console.log("=== Content Processing Complete ===");
  console.log("Final content length:", content.length);
  console.log("File kind:", kind);
  console.log(
    "Content preview (first 1000 chars):",
    content.substring(0, 1000)
  );

  // Generate chunks for all file types
  console.log("=== Generating Chunks ===");
  chunks = await generateChunksFromText(content);
  embeddingInput = chunks.chunks.map((chunk: any) => chunk.pageContent);
  console.log("Total chunks generated:", chunks.chunks.length);
  console.log(
    "First chunk preview:",
    chunks.chunks[0]?.pageContent?.substring(0, 200)
  );
  console.log(
    "Last chunk preview:",
    chunks.chunks[chunks.chunks.length - 1]?.pageContent?.substring(0, 200)
  );

  try {
    console.log("=== Generating Embeddings ===");
    let embeddings;
    try {
      embeddings = await generateEmbeddingsFromChunks(embeddingInput);
      console.log("Embeddings generated:", embeddings.length);
      console.log("First embedding length:", embeddings[0]?.embedding?.length);
    } catch (error) {
      console.log("error generating embeddings", error);
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Error generating embeddings",
      });
    }

    console.log("=== Saving to Database ===");

    try {
      const [resource] = await db
        .insert(resources)
        .values({
          content,
          name,
          description,
          fileUrl: fileUploadedUrl,
          subjectId,
          kind: kind as any,
        })
        .returning();

      console.log("Resource saved with ID:", resource?.id);
      console.log("Resource content length in DB:", resource?.content?.length);

      await db.insert(embeddingsTable).values(
        embeddings.map((embedding) => ({
          resourceId: resource!.id,
          ...embedding,
        }))
      );
    } catch (error) {
      console.log("error saving resource to database", error);
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Error saving resource to database",
      });
    }

    console.log("Embeddings saved to database");
    console.log("Resource and embeddings were created successfully!!!");

    res.json({ message: "Resource added successfully" });
  } catch (error) {
    console.error("Error in database operations:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
