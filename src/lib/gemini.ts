import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const geminiModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash-latest" 
});

export async function askGemini(prompt: string, context: string = "") {
  if (!apiKey) {
    throw new Error("Gemini API key not found in environment variables.");
  }

  const fullPrompt = `
    You are a helpful AI assistant for Nexus OS, a personal knowledge management system.
    Context from the user's notes:
    ${context}

    User Question:
    ${prompt}
  `;

  const result = await geminiModel.generateContent(fullPrompt);
  const response = await result.response;
  return response.text();
}
