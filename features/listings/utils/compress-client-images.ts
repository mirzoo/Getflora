import { maxImageSizeBytes } from "@/features/listings/constants/listing-limits";

const maxImageDimension = 2048;
const preferredImageQuality = 0.92;
const fallbackImageQualities = [0.9, 0.86, 0.82];

export type ImageCompressionSummary = {
  files: File[];
  originalBytes: number;
  compressedBytes: number;
};

export async function compressImageFilesForUpload(files: File[]): Promise<ImageCompressionSummary> {
  const compressedFiles: File[] = [];
  let originalBytes = 0;
  let compressedBytes = 0;

  for (const file of files) {
    originalBytes += file.size;
    const compressedFile = await compressImageFileForUpload(file);
    compressedFiles.push(compressedFile);
    compressedBytes += compressedFile.size;
  }

  return {
    files: compressedFiles,
    originalBytes,
    compressedBytes,
  };
}

async function compressImageFileForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    return file;
  }

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    if (file.size <= maxImageSizeBytes && Math.max(width, height) <= maxImageDimension) {
      return file;
    }

    const scale = Math.min(1, maxImageDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const outputType = file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await compressCanvasToBlob(canvas, outputType);

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const extension = outputType === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";

    return new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function compressCanvasToBlob(canvas: HTMLCanvasElement, type: string) {
  const preferredBlob = await canvasToBlob(canvas, type, preferredImageQuality);

  if (!preferredBlob || preferredBlob.size <= maxImageSizeBytes) {
    return preferredBlob;
  }

  for (const quality of fallbackImageQualities) {
    const blob = await canvasToBlob(canvas, type, quality);

    if (!blob) {
      continue;
    }

    if (blob.size <= maxImageSizeBytes) {
      return blob;
    }
  }

  return preferredBlob;
}
