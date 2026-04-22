/// <reference types="vite/client" />
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

export async function getStudyFiles(): Promise<DriveFile[]> {
  if (!API_KEY || !FOLDER_ID) {
    throw new Error('No se han configurado las claves de Google Drive (API KEY o Folder ID).');
  }

  // Buscamos archivos dentro de la carpeta que sean PDFs.
  const query = `'${FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=\${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink)&key=\${API_KEY}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener archivos de Google Drive.');
  }

  const data = await response.json();
  return data.files || [];
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
  // Retorna la URL de descarga del contenido, la cual se puede usar para fetch() asumiendo que es pÃºblico y tiene CORS.
  // Muchas veces para PDFs pÃºblicos se puede usar:
  return `https://www.googleapis.com/drive/v3/files/\${fileId}?alt=media&key=\${API_KEY}`;
}
