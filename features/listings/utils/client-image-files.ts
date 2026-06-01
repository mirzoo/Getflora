const maxImageFiles = 10;
const maxImageSizeBytes = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageFileInput(form: HTMLFormElement, inputName = "imageFiles") {
  const input = form.elements.namedItem(inputName);

  if (!(input instanceof HTMLInputElement) || !input.files?.length) {
    return "";
  }

  const files = Array.from(input.files);

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

  return "";
}
