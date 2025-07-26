import { createPartFromUri } from "@google/genai";

import { googleGenAIProvider } from "./providers";

/**
 *
 *
 * @param pdfUrl
 * @param fileName
 * @returns
 */
export async function processLargePdfURL(
  pdfUrl: string,
  fileName: string
): Promise<string> {
  console.log("processing large pdf using GOOGLE GEMINI GENAI");

  try {
    const pdfBuffer = await fetch(pdfUrl).then((response) =>
      response.arrayBuffer()
    );

    const fileBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const file = await googleGenAIProvider.files.upload({
      file: fileBlob,
      config: {
        displayName: fileName,
      },
    });

    // Wait for the file to be processed.
    let getFile = await googleGenAIProvider.files.get({ name: fileName });
    while (getFile.state === "PROCESSING") {
      getFile = await googleGenAIProvider.files.get({ name: fileName });
      console.log(`current file status: ${getFile.state}`);
      console.log("File is still processing, retrying in 5 seconds");

      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
    if (file.state === "FAILED") {
      throw new Error("File processing failed.");
    }

    // Add the file to the contents.
    const contents = ["Summarize this document"];

    if (file.uri && file.mimeType) {
      const fileContent = createPartFromUri(file.uri, file.mimeType);
      //@ts-ignore
      contents.push(fileContent);
    }

    const response = await googleGenAIProvider.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    console.log(response.text);
    return response.text ?? "No analysis available";
  } catch (error) {
    console.log("error processing pdf", error);
    return "Error processing pdf";
  }
}
