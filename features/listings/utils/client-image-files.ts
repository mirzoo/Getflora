import {
  maxImageFiles,
  maxImageSizeBytes,
  maxTotalImageSizeBytes,
} from "@/features/listings/constants/listing-limits";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageFileInput(form: HTMLFormElement, inputName = "imageFiles") {
  const input = form.elements.namedItem(inputName);

  if (!(input instanceof HTMLInputElement) || !input.files?.length) {
    return "";
  }

  return validateImageFiles(Array.from(input.files));
}

export function validateImageFiles(files: File[]) {
  if (files.length > maxImageFiles) {
    return "Можно загрузить максимум 10 фото.";
  }

  const unsupportedFile = files.find((file) => !allowedImageTypes.has(file.type));

  if (unsupportedFile) {
    return "Загрузите фото в формате JPG, PNG или WebP.";
  }

  const oversizedFile = files.find((file) => file.size > maxImageSizeBytes);

  if (oversizedFile) {
    return "Размер одного фото не должен превышать 8 МБ.";
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > maxTotalImageSizeBytes) {
    return "Общий размер фото не должен превышать 24 МБ.";
  }

  return "";
}
