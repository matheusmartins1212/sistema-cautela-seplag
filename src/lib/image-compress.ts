/**
 * Redução das fotos no navegador, antes do envio.
 *
 * Por quê: a Vercel recusa requisições acima de 4,5 MB e o armazenamento
 * gratuito do Supabase tem 1 GB. Uma foto de celular (2 a 8 MB) vira um JPEG de
 * cerca de 200 KB com 1280 px no lado maior, nítido o bastante para conferir
 * avarias. Com dez fotos por viagem, 1 GB comporta por volta de 500 viagens. Regravar a imagem também descarta os metadados EXIF, que podem
 * trazer a localização GPS de onde a foto foi tirada.
 */

/** Lado maior da foto enviada, em pixels. */
export const PHOTO_MAX_DIMENSION = 1280;
/** Qualidade JPEG da primeira tentativa (0 a 1). */
export const PHOTO_QUALITY = 0.75;
/** Teto do arquivo enviado, abaixo do limite de 4,5 MB da Vercel. */
export const PHOTO_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Maior foto original aceita para reduzir (câmeras de 48 MP passam de 15 MB). */
export const PHOTO_MAX_ORIGINAL_BYTES = 40 * 1024 * 1024;

/** Tamanho final mantendo a proporção, sem ampliar fotos pequenas. */
export function fitWithin(
  width: number,
  height: number,
  max: number = PHOTO_MAX_DIMENSION,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Nome do arquivo com extensão .jpg (o conteúdo passa a ser JPEG). */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "foto";
  return `${base}.jpg`;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    // "from-image" respeita a rotação gravada pela câmera.
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Devolve a foto pronta para envio: reduzida, em JPEG e sem EXIF. Se o
 * navegador não conseguir abrir o formato, envia o original quando ele já cabe
 * no limite; senão, explica o problema.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size > PHOTO_MAX_ORIGINAL_BYTES) {
    throw new Error("A foto é grande demais. Tire outra com a câmera do celular.");
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    if (file.size <= PHOTO_MAX_UPLOAD_BYTES) return file;
    throw new Error("Não foi possível ler esta foto. Envie em JPEG ou PNG.");
  }

  const { width, height } = fitWithin(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if (file.size <= PHOTO_MAX_UPLOAD_BYTES) return file;
    throw new Error("Não foi possível preparar a foto neste navegador.");
  }
  // Fundo branco: PNG com transparência não fica preto ao virar JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();

  for (const quality of [PHOTO_QUALITY, 0.6, 0.45]) {
    const blob = await toJpeg(canvas, quality);
    if (blob && blob.size <= PHOTO_MAX_UPLOAD_BYTES) {
      return new File([blob], jpegName(file.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  }
  throw new Error("Não foi possível reduzir a foto. Tire outra com menos resolução.");
}
