import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configurar el worker usando el archivo local empacado por Vite para evitar problemas con CDNs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    if (!fullText.trim()) throw new Error("Documento sin texto rastreable");

    return fullText;
  } catch (error: any) {
    console.error('Error procesando el ArrayBuffer del PDF:', error);
    throw new Error(error.message || 'No se pudo leer el PDF.');
  }
}

export async function extractTextFromPdfUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return await extractTextFromPdfBuffer(arrayBuffer);
  } catch (error: any) {
    console.error('Error extrayendo texto del PDF:', error);
    throw new Error(error.message || 'No se pudo cargar o leer el PDF desde la URL.');
  }
}
