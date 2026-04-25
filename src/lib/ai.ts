import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function askOpenRouter(prompt: string, context: string) {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API key missing");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://nexus-os.vercel.app",
      "X-Title": "Nexus OS",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-flash-1.5",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant for Nexus OS. Context from notes: ${context}`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenRouter request failed");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function askGemini(prompt: string, context: string) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key missing");

  const fullPrompt = `Context from notes: ${context}\n\nQuestion: ${prompt}`;
  const result = await geminiModel.generateContent(fullPrompt);
  const response = await result.response;
  return response.text();
}

export async function askAI(prompt: string, context: string = "") {
  // Try OpenRouter first
  if (OPENROUTER_API_KEY) {
    try {
      console.log("Using OpenRouter...");
      return await askOpenRouter(prompt, context);
    } catch (err) {
      console.warn("OpenRouter failed, falling back to Gemini:", err);
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    console.log("Using Direct Gemini...");
    return await askGemini(prompt, context);
  }

  throw new Error("No AI providers configured (OpenRouter or Gemini API key missing)");
}
