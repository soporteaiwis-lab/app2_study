import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client using the environment variable injected by Vite/AI Studio.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function askGeminiAboutPdf(
  question: string, 
  pdfText: string, 
  history: ChatMessage[]
): Promise<string> {
  try {
    // Convert our simplified history into the format expected by the Gemini API
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Add the new user question
    contents.push({
      role: 'user',
      parts: [{ text: question }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: `Eres Gilda, una asistente de estudio experta y amigable.
Tu objetivo principal es responder a las preguntas del estudiante basándote ESTRICTAMENTE en el texto de los apuntes proporcionado a continuación.
Si la respuesta no se encuentra en el texto, debes aclarar amablemente que no tienes esa información en los documentos actuales.

TEXTO DE LOS APUNTES:
-----------------------
\${pdfText}
-----------------------
`,
        temperature: 0.3, // Low temperature for more factual, RAG-style responses
      }
    });

    return response.text || "Lo siento, no pude generar una respuesta.";
  } catch (error: any) {
    console.error("Error from Gemini API:", error);
    throw new Error(error.message || "Error al conectar con la IA de Gemini.");
  }
}
