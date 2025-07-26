import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { GoogleGenAI } from "@google/genai";

export const googleAISDKProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_AI_KEY,
});

export const googleGenAIProvider = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_AI_KEY,
});
