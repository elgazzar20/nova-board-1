import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for images
app.use(express.json({ limit: "10mb" }));

// Initialize GoogleGenAI SDK on the server side
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI Pen recognition will fail.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// AI Pen Handwriting Recognition API Endpoint
app.post("/api/ai-pen/recognize", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Clean base64 data (remove prefix if present)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const ai = getAiClient();
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Please configure it in your Secrets settings.",
      });
    }

    const imagePart = {
      inlineData: {
        mimeType: "image/png",
        data: base64Data,
      },
    };

    const textPart = {
      text: "You are a fast, high-accuracy handwriting recognition engine. Identify and transcribe the handwriting in this image, which may contain Arabic words, English words, math equations, numbers, or symbols. Output ONLY the raw plain text of the transcription. Do not include markdown codeblocks, quotes, preamble, or notes. If the image is blank, return empty.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
    });

    const recognizedText = response.text || "";
    res.json({ text: recognizedText.trim() });
  } catch (error: any) {
    console.error("Error recognizing handwriting:", error);
    res.status(500).json({ error: error.message || "Failed to recognize handwriting" });
  }
});

// Serve API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV });
});

// Vite middleware setup for full-stack integration
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite dev server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static files in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
