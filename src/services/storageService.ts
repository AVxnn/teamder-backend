import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

class StorageService {
  private uploadDir: string;

  constructor() {
    // Создаем папку для загрузки, если её нет
    this.uploadDir = path.join(__dirname, "../../static/uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveImage(base64Image: string, userId: number): Promise<string> {
    try {
      // Удаляем префикс base64 если он есть
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Генерируем уникальное имя файла
      const fileName = `${userId}_${uuidv4()}.jpg`;
      const filePath = path.join(this.uploadDir, fileName);

      // Сохраняем файл
      await fs.promises.writeFile(filePath, buffer);

      // Возвращаем относительный путь к файлу
      return `/uploads/${fileName}`;
    } catch (error) {
      console.error("Error saving image:", error);
      throw error;
    }
  }

  // Метод для удаления старого изображения
  async deleteImage(imagePath: string): Promise<void> {
    try {
      const fullPath = path.join(__dirname, "../../static", imagePath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  }
}

export default new StorageService();
