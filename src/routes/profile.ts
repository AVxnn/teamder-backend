// routes/profile.ts
import { Router, Request, Response } from "express";
import User, {
  ModerationStatus,
  DotaRole,
  IProfile,
  ProfileHero,
} from "../models/User";
import notificationService from "../services/notificationService";
import recommendationService from "../services/recommendationService";
import Hero from "../models/Hero";
import storageService from "../services/storageService";

const router = Router();

// Middleware для проверки аутентификации
const isAuthenticated = async (req: Request, res: Response, next: Function) => {
  const telegramId = req.body.telegramId;

  if (!telegramId) {
    return res.status(401).json({ error: "telegramId is required" });
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in auth middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

router.post("/create", async (req: Request, res: Response): Promise<void> => {
  const {
    telegramId,
    nickname,
    about,
    lookingFor,
    steamId,
    rating,
    hoursPlayed,
    wins,
    losses,
    discordLink,
    steamLink,
    cardImage,
    preferredRoles,
    preferredHeroes,
  } = req.body;

  if (!telegramId) {
    res.status(400).json({ error: "telegramId is required" });
    return;
  }

  if (preferredHeroes && preferredHeroes.length > 3) {
    res.status(400).json({ error: "Maximum 3 preferred heroes allowed" });
    return;
  }

  if (preferredRoles && preferredRoles.length > 3) {
    res.status(400).json({ error: "Maximum 3 preferred roles allowed" });
    return;
  }

  if (preferredRoles) {
    const invalidRoles = preferredRoles.filter(
      (role) => !Object.values(DotaRole).includes(role)
    );
    if (invalidRoles.length > 0) {
      res.status(400).json({ error: "Invalid preferred roles" });
      return;
    }
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Загружаем изображение, если оно есть
    let imageUrl = "";
    if (cardImage) {
      // Если у пользователя уже есть изображение, удаляем его
      if (user.profile?.cardImage) {
        await storageService.deleteImage(user.profile.cardImage);
      }
      imageUrl = await storageService.saveImage(cardImage, telegramId);
    }

    // Получаем полную информацию о выбранных героях
    let heroesData: ProfileHero[] = [];
    if (preferredHeroes && preferredHeroes.length > 0) {
      const heroes = await Hero.find({
        localized_name: {
          $in: preferredHeroes.map((name) => new RegExp(`^${name}$`, "i")),
        },
      }).lean();

      heroesData = heroes.map((hero) => ({
        id: hero.id,
        name: hero.name,
        localized_name: hero.localized_name,
        image_url: hero.image_url,
      }));
    }

    user.profile = {
      nickname,
      about,
      lookingFor,
      steamId,
      rating,
      hoursPlayed,
      wins,
      losses,
      discordLink,
      steamLink,
      cardImage: imageUrl,
      preferredRoles,
      preferredHeroes: heroesData,
      moderationStatus: ModerationStatus.PENDING,
      moderationComment: "",
      moderatedAt: null,
      moderatedBy: null,
    };

    await user.save();

    await notificationService.notifyProfilePending(telegramId);

    res.json({
      success: true,
      message: "Profile card created and sent for moderation",
      profile: user.profile,
    });
  } catch (err) {
    console.error("❌ Profile creation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Удаление карточки пользователя
router.delete("/delete", async (req: Request, res: Response): Promise<void> => {
  const { telegramId } = req.body;

  if (!telegramId) {
    res.status(400).json({ error: "telegramId is required" });
    return;
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Проверяем, есть ли карточка у пользователя
    if (!user.profile) {
      res.status(400).json({ error: "User does not have a profile card" });
      return;
    }

    // Вместо удаления карточки, помечаем её как удаленную
    user.profile.moderationStatus = ModerationStatus.DELETED;
    user.profile.moderationComment = "Карточка удалена пользователем";
    user.profile.moderatedAt = new Date();
    await user.save();

    // Отправляем уведомление об удалении карточки
    await notificationService.notifyProfileDeleted(telegramId);

    res.json({
      success: true,
      message: "Profile card has been marked as deleted",
    });
  } catch (err) {
    console.error("❌ Profile deletion error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Получение профиля пользователя по telegramId
router.get("/:telegramId", async (req: Request, res: Response) => {
  try {
    const telegramId = Number(req.params.telegramId);
    if (!telegramId) {
      return res.status(400).json({ error: "Invalid telegramId" });
    }

    const user = await User.findOne({ telegramId })
      .select("telegramId username firstName photoUrl profile role stars")
      .populate("profile.moderatedBy", "telegramId username firstName");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const likesInfo = await recommendationService.getLikesInfo(telegramId);

    const response = {
      user: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        photoUrl: user.photoUrl,
        role: user.role,
        stars: user.stars,
        profile: {
          ...user.profile,
          preferredRoles: user.profile?.preferredRoles || [],
          preferredHeroes: user.profile?.preferredHeroes || [],
        },
      },
      likes: likesInfo,
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Обновление предпочитаемых героев и ролей
router.put(
  "/update-preferences",
  isAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    const { telegramId, preferredRoles, preferredHeroes } = req.body;

    if (!telegramId) {
      res.status(400).json({ error: "telegramId is required" });
      return;
    }

    // Валидация предпочитаемых героев
    if (preferredHeroes && preferredHeroes.length > 3) {
      res.status(400).json({ error: "Maximum 3 preferred heroes allowed" });
      return;
    }

    // Валидация предпочитаемых ролей
    if (preferredRoles && preferredRoles.length > 3) {
      res.status(400).json({ error: "Maximum 3 preferred roles allowed" });
      return;
    }

    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (!user.profile) {
        res.status(400).json({ error: "User does not have a profile" });
        return;
      }
      // Получаем полную информацию о выбранных героях
      let heroesData: ProfileHero[] = [];
      if (preferredHeroes && preferredHeroes.length > 0) {
        const heroes = await Hero.find({
          localized_name: {
            $in: preferredHeroes.map((name) => new RegExp(`^${name}$`, "i")),
          },
        }).lean();

        console.log("Found heroes:", heroes); // Для отладки

        heroesData = heroes.map((hero) => ({
          id: hero.id,
          name: hero.name,
          localized_name: hero.localized_name,
          image_url: hero.image_url,
        }));

        console.log("Mapped heroesData:", heroesData); // Для отладки
      }

      // Обновляем предпочитаемые роли и герои
      if (preferredRoles) {
        user.profile.preferredRoles = preferredRoles;
      }
      if (preferredHeroes && heroesData.length > 0) {
        user.profile.preferredHeroes = heroesData;
        console.log("Updated user heroes:", user.profile.preferredHeroes); // Для отладки
      }

      await user.save();

      res.json({
        success: true,
        message: "Preferences updated successfully",
        profile: user.profile,
      });
    } catch (err) {
      console.error("❌ Preferences update error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
