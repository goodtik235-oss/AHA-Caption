
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Caption } from "../types";

// Safe access to API_KEY to prevent ReferenceError: process is not defined
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const API_KEY = getApiKey();

export async function transcribeAudio(audioBase64: string, signal?: AbortSignal): Promise<Caption[]> {
  if (!API_KEY) throw new Error("Gemini API Key is not configured. Please set the API_KEY environment variable.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `Transcribe this audio into a JSON array of captions. 
  Each caption must have: "id" (string), "start" (number in seconds), "end" (number in seconds), and "text" (string).
  Make sure the timestamps are accurate and segments are concise (max 10 words per segment).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: audioBase64, mimeType: 'audio/wav' } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            start: { type: Type.NUMBER },
            end: { type: Type.NUMBER },
            text: { type: Type.STRING }
          },
          required: ["id", "start", "end", "text"]
        }
      }
    }
  });

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return JSON.parse(response.text || "[]");
}

export async function fixCaptions(captions: Caption[], signal?: AbortSignal): Promise<Caption[]> {
  if (!API_KEY) throw new Error("Gemini API Key is not configured.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `Review and fix the following video captions. 
  Improve grammar, punctuation, and capitalization while keeping the exact same structure, IDs, and timestamps.
  
  Captions:
  ${JSON.stringify(captions)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            start: { type: Type.NUMBER },
            end: { type: Type.NUMBER },
            text: { type: Type.STRING }
          },
          required: ["id", "start", "end", "text"]
        }
      }
    }
  });

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return JSON.parse(response.text || "[]");
}

export async function translateCaptions(captions: Caption[], targetLang: string, signal?: AbortSignal): Promise<Caption[]> {
  if (!API_KEY) throw new Error("Gemini API Key is not configured.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `Translate the following video captions into ${targetLang}. 
  Maintain the exact same IDs and timestamps. Return as a JSON array.
  
  Captions:
  ${JSON.stringify(captions)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            start: { type: Type.NUMBER },
            end: { type: Type.NUMBER },
            text: { type: Type.STRING }
          },
          required: ["id", "start", "end", "text"]
        }
      }
    }
  });

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return JSON.parse(response.text || "[]");
}

export async function generateSpeech(text: string, signal?: AbortSignal): Promise<string> {
  if (!API_KEY) throw new Error("Gemini API Key is not configured.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  
  return base64Audio;
}
