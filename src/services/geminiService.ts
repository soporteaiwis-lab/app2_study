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
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

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
        temperature: 0.3,
      }
    });

    return response.text || "Lo siento, no pude generar una respuesta.";
  } catch (error: any) {
    console.error("Error from Gemini API:", error);
    throw new Error(error.message || "Error al conectar con la IA de Gemini.");
  }
}

export async function generateHtmlInfographic(topic: string, pdfText?: string): Promise<string> {
  try {
    const contextText = pdfText ? `\nUsa este contexto extraído de los apuntes para la información:\n\n${pdfText}` : "";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Genera una infografía visual e interactiva en puro HTML y Tailwind CSS (vía CDN) sobre el tema: "${topic}".
      ${contextText}
      
      Reglas ESPECÍFICAS Y ESTRICTAS:
      1. SÓLO debes devolver código HTML. Nada de backticks, bloques de markdown (como \`\`\`html), explicaciones previas ni texto posterior. Solo el HTML crudo.
      2. No uses iframes, el HTML resultante se inyectará en un contenedor div o iframe con srcDoc.
      3. Importa Tailwind desde 'https://cdn.tailwindcss.com'. Usa colores vibrantes (como paletas blue/indigo/purple).
      4. Haz que contenga un Hero section bonito, un grid tipo BENTO o tarjetas con los puntos clave, y buenos iconos (puedes usar SVG nativos).
      5. Tiene que ser responsivo y verse extremadamente moderno.
      `,
      config: {
        temperature: 0.7,
      }
    });

    // Remove markdown code blocks if the model still accidentally includes them
    let html = response.text || "<div>Error al generar</div>";
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    return html;
  } catch (error: any) {
    console.error("Infographic generation error:", error);
    throw new Error("No se pudo generar la infografía.");
  }
}

export async function generateAudioSummary(topic: string, pdfText?: string): Promise<string> {
   try {
    const contextText = pdfText ? `\nContexto: ${pdfText}` : "";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Imagina que eres un locutor de un podcast breve (tipo cápsula de conocimiento) que resume el tema: "${topic}".
      ${contextText}
      Crea un guion conversacional, energético y muy directo. Como si estuvieras hablando a un amigo estudiante. 
      Máximo 4 o 5 párrafos. Mantenlo emocionante y fácil de entender.
      `,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "No se pudo generar el guion para el audio.";
  } catch (error: any) {
    console.error("Audio generation error:", error);
    throw new Error("No se pudo generar el guion.");
  }
}
