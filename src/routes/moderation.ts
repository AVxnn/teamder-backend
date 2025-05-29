import { Router, Request, Response, NextFunction } from "express";
import User, { UserRole, ModerationStatus } from "../models/User";
import notificationService from "../services/notificationService";

const router = Router();

// Middleware для проверки прав администратора
const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("req", req.body);
  const { telegramId } = req.body;

  if (!telegramId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await User.findOne({ telegramId });

  if (!user || user.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }

  next();
};

// Получить все карточки на модерацию
router.post(
  "/pending",
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const pendingProfiles = await User.find({
        "profile.moderationStatus": ModerationStatus.PENDING,
      }).select("telegramId username firstName photoUrl profile");
      console.log(pendingProfiles);
      res.json({ success: true, profiles: pendingProfiles });
    } catch (error) {
      console.error("❌ Error fetching pending profiles:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
// Модерировать карточку
router.post(
  "/moderate",
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { userId, status, comment, telegramId } = req.body;

    // Валидация входных данных
    // if (!telegramId || !status || !Object.values(ModerationStatus).includes(status)) {
    //   res.status(400).json({
    //     success: false,
    //     error: 'Invalid request parameters',
    //     required: {
    //       telegramId: 'number',
    //       status: 'APPROVED | REJECTED | PENDING',
    //       comment: 'string (optional)'
    //     }
    //   });
    //   return;
    // }

    try {
      // Находим пользователя и модератора
      const [user, moderator] = await Promise.all([
        User.findOne({ telegramId: userId }),
        User.findOne({ telegramId: telegramId }),
      ]);

      if (!user) {
        res.status(404).json({ success: false, error: "User not found" });
        return;
      }

      if (!moderator) {
        res.status(404).json({ success: false, error: "Moderator not found" });
        return;
      }

      // Инициализируем или обновляем профиль
      user.profile = {
        ...user.profile,
        moderationStatus: status,
        moderationComment: comment || "",
        moderatedAt: new Date(),
        moderatedBy: moderator._id,
      };

      await user.save();

      // Отправляем уведомление
      try {
        if (status === ModerationStatus.APPROVED) {
          await notificationService.notifyProfileApproved(user.telegramId);
        } else if (status === ModerationStatus.REJECTED) {
          await notificationService.notifyProfileRejected(
            user.telegramId,
            comment || ""
          );
        }
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
        // Продолжаем выполнение даже если уведомление не отправилось
      }

      res.json({
        success: true,
        message: `Profile ${status.toLowerCase()}`,
        profile: user.profile,
      });
    } catch (error) {
      console.error("❌ Error moderating profile:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Получение списка профилей на модерацию
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const pendingProfiles = await User.find({
      "profile.moderationStatus": ModerationStatus.PENDING,
    })
      .select("telegramId username firstName photoUrl profile")
      .populate("profile.moderatedBy", "telegramId username firstName");

    const formattedProfiles = pendingProfiles.map((user) => ({
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      photoUrl: user.photoUrl,
      profile: user.profile,
    }));

    res.json(formattedProfiles);
  } catch (error) {
    console.error("Error getting pending profiles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
