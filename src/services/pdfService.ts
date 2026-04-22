import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker (esto soluciona problemas en entornos de navegador)
// Usamos el CDN para evitar complicaciones con el bundler de Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/\${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPdfUrl(url: string): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    let fullText = '';

    // Extraemos pÃ¡gina por pÃ¡gina
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\\n\\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error);
    throw new Error('No se pudo extraer el texto del PDF. Verifica que el archivo sea pÃºblico o tenga permisos CORS habilitados.');
  }
}
