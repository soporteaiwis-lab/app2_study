/// <reference types="vite/client" />
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
}

// Usamos la API Key que proporcionaste como respaldo si no está en las variables de entorno
const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || "AIzaSyBddTGyTGNUCCp-ukZj5Jgs2iWc69iA9fQ";
// IMPORTANTE: Aún necesitamos el ID de la carpeta pública
const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

export async function getStudyFiles(): Promise<DriveFile[]> {
  if (!API_KEY) {
    throw new Error('Falta la API Key de Google Drive.');
  }
  if (!FOLDER_ID) {
    throw new Error('Falta el ID de la carpeta (FOLDER_ID). No sé en qué carpeta buscar los apuntes. Agrega VITE_GOOGLE_DRIVE_FOLDER_ID a tus variables.');
  }

  // Buscamos archivos dentro de la carpeta que sean PDFs.
  const query = `'${FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink)&key=\${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Detalles del error de Google Drive:", data);
      throw new Error(`Google Drive devolvió un error: \${data.error?.message || response.statusText}`);
    }

    return data.files || [];
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar conectar con Google Drive.');
  }
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
  return `https://www.googleapis.com/drive/v3/files/\${fileId}?alt=media&key=\${API_KEY}`;
}
