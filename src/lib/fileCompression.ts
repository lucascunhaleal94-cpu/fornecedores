import { toast } from 'sonner';

const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.72;
const MAX_NON_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

export async function processAttachmentFile(file: File): Promise<string | null> {
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
    try {
      return await compressImageToDataUrl(file);
    } catch {
      // Fallback para leitura padrão caso o canvas falhe
    }
  }

  if (file.size > MAX_NON_IMAGE_BYTES) {
    toast.error(
      `O arquivo "${file.name}" tem ${(file.size / (1024 * 1024)).toFixed(1)} MB (limite: 3 MB). ` +
      'Para arquivos grandes ou vídeos, suba no Google Drive e cole o link.'
    );
    return null;
  }

  return await readFileAsDataUrl(file);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao decodificar imagem'));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
        resolve(compressed);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
