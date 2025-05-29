export function validateImage(base64Image: string): boolean {
  // Проверка размера (максимум 5MB)
  const sizeInBytes = Math.ceil((base64Image.length * 3) / 4);
  if (sizeInBytes > 5 * 1024 * 1024) {
    throw new Error("Image size should not exceed 5MB");
  }

  // Проверка формата
  const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,/);
  if (!matches || !["jpeg", "jpg", "png"].includes(matches[1].toLowerCase())) {
    throw new Error("Only JPEG and PNG images are allowed");
  }

  return true;
}
