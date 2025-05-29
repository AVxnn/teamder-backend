import { Router, Request, Response } from "express";
import dotaApiService from "../services/dotaApiService";

const router = Router();

// Получение всех героев
router.get("/", async (req: Request, res: Response) => {
  try {
    const heroes = await dotaApiService.getHeroes();
    res.json(heroes);
  } catch (error: any) {
    console.error("Error getting heroes:", error);
    res.status(500).json({ error: error.message });
  }
});

// Принудительное обновление списка героев
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const heroes = await dotaApiService.fetchAndSaveHeroes();
    res.json({
      success: true,
      message: "Heroes synchronized successfully",
      heroes,
    });
  } catch (error: any) {
    console.error("Error syncing heroes:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
