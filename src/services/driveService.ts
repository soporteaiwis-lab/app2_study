/// <reference types="vite/client" />
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
}

// Usamos la API Key que proporcionaste como respaldo si no está en las variables de entorno
const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || "AIzaSyBddTGyTGNUCCp-ukZj5Jgs2iWc69iA9fQ";
// IMPORTANTE: Ahora con tu FOLDER_ID proporcionado
const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || "1HmB4SVm7WraN-4ELBxaEm3RcTjZ9t8Vq";

export async function getStudyFiles(): Promise<DriveFile[]> {
  if (!API_KEY) {
    throw new Error('Falta la API Key de Google Drive.');
  }
  if (!FOLDER_ID) {
    throw new Error('Falta el ID de la carpeta (FOLDER_ID). No sé en qué carpeta buscar los apuntes. Agrega VITE_GOOGLE_DRIVE_FOLDER_ID a tus variables.');
  }

  // Buscamos archivos que NO sean carpetas dentro del folder indicado
  const query = `'${FOLDER_ID}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink)&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Detalles del error de Google Drive:", data);
      throw new Error(`Google Drive devolvió un error: ${data.error?.message || response.statusText}`);
    }

    return data.files || [];
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar conectar con Google Drive.');
  }
}

export async function getFileDownloadUrl(fileId: string, mimeType?: string): Promise<string> {
  // Si es un Google Doc, necesitamos usar el endpoint de exportación a texto plano
  if (mimeType === 'application/vnd.google-apps.document') {
    return `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&key=${API_KEY}`;
  }
  // Para los demás archivos (PDFs) usamos alt=media
  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
}
