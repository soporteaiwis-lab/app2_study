import * as mammoth from 'mammoth';

export async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (!result.value.trim()) {
      throw new Error("El documento DOCX parece no tener texto.");
    }
    return result.value;
  } catch (error: any) {
    console.error('Error extrayendo texto del DOCX:', error);
    throw new Error(error.message || 'No se pudo leer el archivo DOCX.');
  }
}
