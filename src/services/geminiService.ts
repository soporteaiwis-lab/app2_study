import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client using the environment variable injected by Vite/AI Studio.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function askGeminiAboutSources(
  question: string, 
  sourcesText: string, 
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
        systemInstruction: `Eres Gilda, una asistente de estudio experta inspirada en NotebookLM.
Tu objetivo principal es responder a las preguntas del estudiante basándote ESTRICTAMENTE en las fuentes de texto proporcionadas a continuación.
Si te hacen una pregunta que no se puede responder con las fuentes, debes aclarar amablemente que la información no está en los documentos seleccionados.

FUENTES DE ESTUDIO SELECCIONADAS:
-----------------------
\${sourcesText}
-----------------------
`,
        temperature: 0.2,
      }
    });

    return response.text || "Lo siento, no pude generar una respuesta.";
  } catch (error: any) {
    console.error("Error from Gemini API:", error);
    if (error.message && error.message.includes("leaked")) {
      throw new Error("⚠️ Tu clave de Gemini (API KEY) ha sido reportada como filtrada o comprometida por Google. Ve a Google AI Studio, genera una nueva clave y actualízala en el panel 'Settings' o 'Secrets' de la izquierda.");
    }
    throw new Error(error.message || "Error al conectar con la IA de Gemini.");
  }
}

export async function generateSuggestedQuestions(contextText: string): Promise<string[]> {
  try {
    if (!contextText || contextText.trim().length < 50) {
      return ["¿De qué trata este documento?", "¿Cuáles son los conceptos clave?", "¿Puedes hacerme un resumen?"];
    }

    const prompt = `Analiza estrictamente el contenido de los siguientes documentos. Extrae los temas principales y formula 3 preguntas muy específicas, interesantes y útiles que alguien podría hacer para estudiar u obtener información de estos textos.
    
REGLA CRÍTICA Y ESTRICTA: NO inventes temas. Las preguntas deben tratar EXACTAMENTE sobre la información provista en las fuentes. Por ejemplo, si el texto trata sobre administración de empresas, no preguntes sobre el sistema solar ni astronomía. Asegúrate de comprender de qué hablan los documentos y basa tus preguntas solo en eso.

Devuelve un arreglo en formato JSON con 3 strings. Ejemplo: ["¿Pregunta 1?", "¿Pregunta 2?", "¿Pregunta 3?"]

FUENTES DE INFORMACIÓN:
\${contextText.substring(0, 45000)}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || "[]";
    let questions: string[] = [];
    try {
      questions = JSON.parse(text);
    } catch(e) {
      questions = [];
    }
    
    if (Array.isArray(questions) && questions.length > 0) {
      return questions.filter(q => typeof q === 'string' && q.length > 10).slice(0, 3);
    }

    return ["¿Puedes resumir las ideas principales?", "¿Cuáles son los temas centrales?", "¿Qué datos clave hay aquí?"];
  } catch (error: any) {
    console.error("Suggested questions error:", error);
    return ["¿Qué nos dicen estos documentos?", "¿Puedes resumir las ideas?", "¿Cuáles son los puntos importantes?"];
  }
}

export async function generateStudioContent(type: 'resumen' | 'cuestionario' | 'tips' | 'analisis', contextText: string): Promise<string> {
  let prompt = "";
  if (type === 'resumen') {
    prompt = `Genera un resumen ejecutivo estructurado con viñetas, destacando los puntos más críticos de las siguientes fuentes:\n\n\${contextText}`;
  } else if (type === 'cuestionario') {
    prompt = `Genera un cuestionario de estudio desafiante (mínimo 5 preguntas de opción múltiple o desarrollo) basado en las siguientes fuentes. Asegúrate de incluir una sección de Respuestas Correctas al final:\n\n\${contextText}`;
  } else if (type === 'tips') {
    prompt = `Extrae la información provista y genera una lista de "Tips de Estudio" y reglas mnemotécnicas para que un estudiante memorice y entienda fácilmente estos conceptos:\n\n\${contextText}`;
  } else if (type === 'analisis') {
    prompt = `Realiza un análisis profundo, crítico y conceptual de la información provista en estas fuentes. Compara ideas si es posible y concluye con una perspectiva general:\n\n\${contextText}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.5 }
    });
    return response.text || "No se pudo generar el contenido.";
  } catch (error: any) {
    console.error("Studio generation error:", error);
    if (error.message && error.message.includes("leaked")) {
      throw new Error("⚠️ Tu clave de Gemini (API KEY) ha sido reportada como filtrada. Genera una nueva clave y actualízala.");
    }
    throw new Error("No se pudo generar el contenido de estudio.");
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
    if (error.message && error.message.includes("leaked")) {
      throw new Error("⚠️ Tu clave de Gemini (API KEY) ha sido reportada como filtrada. Genera una nueva clave y actualízala.");
    }
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
    if (error.message && error.message.includes("leaked")) {
      throw new Error("⚠️ Tu clave de Gemini (API KEY) ha sido reportada como filtrada. Genera una nueva clave y actualízala.");
    }
    throw new Error("No se pudo generar el guion.");
  }
}
