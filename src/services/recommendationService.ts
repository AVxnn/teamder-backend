import User, { ModerationStatus, DotaRole } from "../models/User";
import notificationService from "./notificationService";
import Like, { LikeType } from "../models/Like";

interface RecommendationFilters {
  minRating?: number;
  maxRating?: number;
  minGamesPlayed?: number;
  maxGamesPlayed?: number;
  lookingFor?: string;
  preferredHeroes?: string[];
  preferredRoles?: string[];
}

interface LikesLimit {
  dailyLimit: number;
  likesUsedToday: number;
  extraLikes: number;
  lastResetDate: Date;
}

interface SuperLikesLimit {
  dailyLimit: number;
  superLikesUsedToday: number;
  extraSuperLikes: number;
  lastResetDate: Date;
}

class RecommendationService {
  // Проверка и сброс дневного лимита лайков
  private async checkAndResetDailyLimit(user: any) {
    if (!user.likesLimit) {
      user.likesLimit = {
        dailyLimit: 20,
        likesUsedToday: 0,
        extraLikes: 0,
        lastResetDate: new Date(),
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastReset = new Date(user.likesLimit.lastResetDate);
    lastReset.setHours(0, 0, 0, 0);

    if (lastReset < today) {
      user.likesLimit.likesUsedToday = 0;
      user.likesLimit.lastResetDate = new Date();
      await user.save();
    }
  }

  // Проверка и сброс дневного лимита суперлайков
  private async checkAndResetSuperLikesLimit(user: any) {
    if (!user.superLikesLimit) {
      user.superLikesLimit = {
        dailyLimit: 3,
        superLikesUsedToday: 0,
        extraSuperLikes: 0,
        lastResetDate: new Date(),
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastReset = new Date(user.superLikesLimit.lastResetDate);
    lastReset.setHours(0, 0, 0, 0);

    if (lastReset < today) {
      user.superLikesLimit.superLikesUsedToday = 0;
      user.superLikesLimit.lastResetDate = new Date();
      await user.save();
    }
  }

  // Проверка доступности лайков
  private async checkLikesAvailability(user: any): Promise<boolean> {
    await this.checkAndResetDailyLimit(user);

    if (!user.likesLimit) {
      return false;
    }

    const totalAvailableLikes =
      user.likesLimit.dailyLimit + user.likesLimit.extraLikes;
    return user.likesLimit.likesUsedToday < totalAvailableLikes;
  }

  // Проверка доступности суперлайков
  private async checkSuperLikesAvailability(user: any): Promise<boolean> {
    await this.checkAndResetSuperLikesLimit(user);

    if (!user.superLikesLimit) {
      return false;
    }

    const totalAvailableSuperLikes =
      user.superLikesLimit.dailyLimit + user.superLikesLimit.extraSuperLikes;
    return user.superLikesLimit.superLikesUsedToday < totalAvailableSuperLikes;
  }

  // Покупка дополнительных лайков
  async purchaseExtraLikes(
    telegramId: number,
    amount: number,
    starsCost: number
  ) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error("User not found");
      }

      if (user.stars < starsCost) {
        throw new Error("Not enough stars");
      }

      if (!user.likesLimit) {
        user.likesLimit = {
          dailyLimit: 20,
          likesUsedToday: 0,
          extraLikes: 0,
          lastResetDate: new Date(),
        };
      }

      user.stars -= starsCost;
      user.likesLimit.extraLikes += amount;
      await user.save();

      return {
        success: true,
        message: `Successfully purchased ${amount} extra likes`,
        remainingStars: user.stars,
        totalAvailableLikes:
          user.likesLimit.dailyLimit + user.likesLimit.extraLikes,
      };
    } catch (error) {
      console.error("Error purchasing extra likes:", error);
      throw error;
    }
  }

  // Покупка дополнительных суперлайков
  async purchaseExtraSuperLikes(
    telegramId: number,
    amount: number,
    starsCost: number
  ) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error("User not found");
      }

      if (user.stars < starsCost) {
        throw new Error("Not enough stars");
      }

      if (!user.superLikesLimit) {
        user.superLikesLimit = {
          dailyLimit: 3,
          superLikesUsedToday: 0,
          extraSuperLikes: 0,
          lastResetDate: new Date(),
        };
      }

      user.stars -= starsCost;
      user.superLikesLimit.extraSuperLikes += amount;
      await user.save();

      return {
        success: true,
        message: `Successfully purchased ${amount} extra super likes`,
        remainingStars: user.stars,
        totalAvailableSuperLikes:
          user.superLikesLimit.dailyLimit +
          user.superLikesLimit.extraSuperLikes,
      };
    } catch (error) {
      console.error("Error purchasing extra super likes:", error);
      throw error;
    }
  }

  // Получение информации о доступных лайках и суперлайках
  async getLikesInfo(telegramId: number) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error("User not found");
      }

      await this.checkAndResetDailyLimit(user);
      await this.checkAndResetSuperLikesLimit(user);

      const likesInfo = !user.likesLimit
        ? {
            dailyLimit: 20,
            likesUsedToday: 0,
            extraLikes: 0,
            totalAvailableLikes: 20,
            remainingLikes: 20,
          }
        : {
            dailyLimit: user.likesLimit.dailyLimit,
            likesUsedToday: user.likesLimit.likesUsedToday,
            extraLikes: user.likesLimit.extraLikes,
            totalAvailableLikes:
              user.likesLimit.dailyLimit + user.likesLimit.extraLikes,
            remainingLikes:
              user.likesLimit.dailyLimit +
              user.likesLimit.extraLikes -
              user.likesLimit.likesUsedToday,
          };

      const superLikesInfo = !user.superLikesLimit
        ? {
            dailyLimit: 3,
            superLikesUsedToday: 0,
            extraSuperLikes: 0,
            totalAvailableSuperLikes: 3,
            remainingSuperLikes: 3,
          }
        : {
            dailyLimit: user.superLikesLimit.dailyLimit,
            superLikesUsedToday: user.superLikesLimit.superLikesUsedToday,
            extraSuperLikes: user.superLikesLimit.extraSuperLikes,
            totalAvailableSuperLikes:
              user.superLikesLimit.dailyLimit +
              user.superLikesLimit.extraSuperLikes,
            remainingSuperLikes:
              user.superLikesLimit.dailyLimit +
              user.superLikesLimit.extraSuperLikes -
              user.superLikesLimit.superLikesUsedToday,
          };

      return {
        likes: likesInfo,
        superLikes: superLikesInfo,
      };
    } catch (error) {
      console.error("Error getting likes info:", error);
      throw error;
    }
  }

  // Получение рекомендаций для пользователя
  async getRecommendations(
    telegramId: number,
    filters: RecommendationFilters = {}
  ) {
    try {
      const {
        minRating,
        maxRating,
        preferredHeroes = [],
        preferredRoles = [],
      } = filters;

      // Базовый запрос для поиска пользователей
      const query: any = {
        telegramId: { $ne: telegramId }, // Исключаем текущего пользователя
        "profile.moderationStatus": "approved", // Только одобренные профили
      };

      // Добавляем фильтр по рейтингу, если указан
      if (minRating !== undefined || maxRating !== undefined) {
        query["profile.rating"] = {};
        if (minRating !== undefined) {
          query["profile.rating"].$gte = minRating;
        }
        if (maxRating !== undefined) {
          query["profile.rating"].$lte = maxRating;
        }
      }

      // Добавляем фильтр по ролям, если они указаны
      if (preferredRoles && preferredRoles.length > 0) {
        query["profile.preferredRoles"] = {
          $in: preferredRoles,
        };
      }

      // Добавляем фильтр по героям, если они указаны
      if (preferredHeroes && preferredHeroes.length > 0) {
        query["profile.preferredHeroes.localized_name"] = {
          $in: preferredHeroes.map((name) => new RegExp(`^${name}$`, "i")),
        };
      }

      console.log("Search query:", JSON.stringify(query, null, 2)); // Для отладки

      // Получаем пользователей, соответствующих фильтрам
      const users = await User.find(query)
        .select("telegramId username firstName photoUrl profile role stars")
        .limit(20); // Ограничиваем количество результатов

      console.log("Found users:", users.length); // Для отладки

      // Возвращаем только информацию о пользователях
      return users.map((user) => ({
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        photoUrl: user.photoUrl,
        role: user.role,
        stars: user.stars,
        profile: user.profile,
      }));
    } catch (error) {
      console.error("Error getting recommendations:", error);
      throw error;
    }
  }

  // Лайк пользователя
  async likeUser(fromTelegramId: number, toTelegramId: number) {
    try {
      const [fromUser, toUser] = await Promise.all([
        User.findOne({ telegramId: fromTelegramId }),
        User.findOne({ telegramId: toTelegramId }),
      ]);

      if (!fromUser || !toUser) {
        throw new Error("User not found");
      }

      if (
        !fromUser.profile ||
        fromUser.profile.moderationStatus !== ModerationStatus.APPROVED
      ) {
        throw new Error("Your profile must be approved to like others");
      }

      // Проверяем, не лайкал ли уже этот пользователь
      const hasLiked = fromUser.likesGiven.some((like) =>
        like.userId?.equals(toUser._id)
      );
      if (hasLiked) {
        throw new Error("You have already liked this user");
      }

      // Проверяем доступность лайков
      const canLike = await this.checkLikesAvailability(fromUser);
      if (!canLike) {
        throw new Error(
          "Daily likes limit reached. You can purchase extra likes for stars."
        );
      }

      // Проверяем взаимность
      const isMutual = toUser.likesGiven.some((like) =>
        like.userId?.equals(fromUser._id)
      );

      // Добавляем лайк
      fromUser.likesGiven.push({
        userId: toUser._id,
        type: "regular",
        date: new Date(),
        isMutual,
      });

      toUser.likesReceived.push({
        userId: fromUser._id,
        type: "regular",
        date: new Date(),
        isMutual,
      });

      // Если есть взаимность, обновляем статус у существующего лайка
      if (isMutual) {
        const toUserLike = toUser.likesGiven.find((like) =>
          like.userId?.equals(fromUser._id)
        );
        if (toUserLike) {
          toUserLike.isMutual = true;
        }
        const fromUserLike = fromUser.likesReceived.find((like) =>
          like.userId?.equals(toUser._id)
        );
        if (fromUserLike) {
          fromUserLike.isMutual = true;
        }
      }

      if (!fromUser.likesLimit) {
        fromUser.likesLimit = {
          dailyLimit: 20,
          likesUsedToday: 0,
          extraLikes: 0,
          lastResetDate: new Date(),
        };
      }
      fromUser.likesLimit.likesUsedToday += 1;

      await Promise.all([fromUser.save(), toUser.save()]);

      // Отправляем уведомление
      await notificationService.notifyLike(fromTelegramId, toTelegramId);

      return {
        success: true,
        remainingLikes:
          fromUser.likesLimit.dailyLimit +
          fromUser.likesLimit.extraLikes -
          fromUser.likesLimit.likesUsedToday,
        isMutual,
      };
    } catch (error) {
      console.error("Error liking user:", error);
      throw error;
    }
  }

  // Суперлайк пользователя
  async superLikeUser(fromTelegramId: number, toTelegramId: number) {
    try {
      const [fromUser, toUser] = await Promise.all([
        User.findOne({ telegramId: fromTelegramId }),
        User.findOne({ telegramId: toTelegramId }),
      ]);

      if (!fromUser || !toUser) {
        throw new Error("User not found");
      }

      if (
        !fromUser.profile ||
        fromUser.profile.moderationStatus !== ModerationStatus.APPROVED
      ) {
        throw new Error("Your profile must be approved to super like others");
      }

      // Проверяем, не лайкал ли уже этот пользователь
      const hasLiked = fromUser.likesGiven.some((like) =>
        like.userId?.equals(toUser._id)
      );
      if (hasLiked) {
        throw new Error("You have already liked this user");
      }

      // Проверяем доступность суперлайков
      const canSuperLike = await this.checkSuperLikesAvailability(fromUser);
      if (!canSuperLike) {
        throw new Error(
          "Daily super likes limit reached. You can purchase extra super likes for stars."
        );
      }

      // Проверяем взаимность
      const isMutual = toUser.likesGiven.some((like) =>
        like.userId?.equals(fromUser._id)
      );

      // Добавляем суперлайк
      fromUser.likesGiven.push({
        userId: toUser._id,
        type: "super",
        date: new Date(),
        isMutual,
      });

      toUser.likesReceived.push({
        userId: fromUser._id,
        type: "super",
        date: new Date(),
        isMutual,
      });

      // Если есть взаимность, обновляем статус у существующего лайка
      if (isMutual) {
        const toUserLike = toUser.likesGiven.find((like) =>
          like.userId?.equals(fromUser._id)
        );
        if (toUserLike) {
          toUserLike.isMutual = true;
        }
        const fromUserLike = fromUser.likesReceived.find((like) =>
          like.userId?.equals(toUser._id)
        );
        if (fromUserLike) {
          fromUserLike.isMutual = true;
        }
      }

      if (!fromUser.superLikesLimit) {
        fromUser.superLikesLimit = {
          dailyLimit: 3,
          superLikesUsedToday: 0,
          extraSuperLikes: 0,
          lastResetDate: new Date(),
        };
      }
      fromUser.superLikesLimit.superLikesUsedToday += 1;

      await Promise.all([fromUser.save(), toUser.save()]);

      // Отправляем уведомление о суперлайке
      await notificationService.notifySuperLike(fromTelegramId, toTelegramId);

      return {
        success: true,
        remainingSuperLikes:
          fromUser.superLikesLimit.dailyLimit +
          fromUser.superLikesLimit.extraSuperLikes -
          fromUser.superLikesLimit.superLikesUsedToday,
        isMutual,
      };
    } catch (error) {
      console.error("Error super liking user:", error);
      throw error;
    }
  }

  // Дизлайк пользователя
  async dislikeUser(fromTelegramId: number, toTelegramId: number) {
    try {
      const [fromUser, toUser] = await Promise.all([
        User.findOne({ telegramId: fromTelegramId }),
        User.findOne({ telegramId: toTelegramId }),
      ]);

      if (!fromUser || !toUser) {
        throw new Error("User not found");
      }

      // Удаляем лайки в обоих направлениях
      fromUser.likesGiven = fromUser.likesGiven.filter(
        (like) => !like.userId?.equals(toUser._id)
      );
      toUser.likesReceived = toUser.likesReceived.filter(
        (like) => !like.userId?.equals(fromUser._id)
      );

      // Если был взаимный лайк, обновляем статус у оставшегося лайка
      const remainingLike = toUser.likesGiven.find((like) =>
        like.userId?.equals(fromUser._id)
      );
      if (remainingLike) {
        remainingLike.isMutual = false;
      }

      await Promise.all([fromUser.save(), toUser.save()]);

      return { success: true };
    } catch (error) {
      console.error("Error disliking user:", error);
      throw error;
    }
  }

  // Получение списка тех, кто лайкнул пользователя
  async getLikesReceived(telegramId: number) {
    try {
      const user = await User.findOne({ telegramId }).populate(
        "likesReceived.userId",
        "telegramId username firstName photoUrl profile"
      );

      if (!user) {
        throw new Error("User not found");
      }

      return user.likesReceived.map((like) => ({
        user: like.userId,
        type: like.type,
        date: like.date,
        isMutual: like.isMutual,
      }));
    } catch (error) {
      console.error("Error getting likes received:", error);
      throw error;
    }
  }

  // Получение списка тех, кого пользователь лайкнул
  async getLikesGiven(telegramId: number) {
    try {
      const user = await User.findOne({ telegramId }).populate(
        "likesGiven.userId",
        "telegramId username firstName photoUrl profile"
      );

      if (!user) {
        throw new Error("User not found");
      }

      return user.likesGiven.map((like) => ({
        user: like.userId,
        type: like.type,
        date: like.date,
        isMutual: like.isMutual,
      }));
    } catch (error) {
      console.error("Error getting likes given:", error);
      throw error;
    }
  }

  // Получение информации о лайках между пользователями
  async getLikesBetweenUsers(
    fromTelegramId: number,
    toTelegramId: number
  ): Promise<{ fromUser: boolean; toUser: boolean }> {
    try {
      const [fromUser, toUser] = await Promise.all([
        User.findOne({ telegramId: fromTelegramId }),
        User.findOne({ telegramId: toTelegramId }),
      ]);

      if (!fromUser || !toUser) {
        throw new Error("User not found");
      }

      // Проверяем лайки в обоих направлениях
      const fromUserLike = fromUser.likesGiven.some(
        (like) =>
          like.userId?.equals(toUser._id) &&
          (like.type === "regular" || like.type === "super")
      );

      const toUserLike = toUser.likesGiven.some(
        (like) =>
          like.userId?.equals(fromUser._id) &&
          (like.type === "regular" || like.type === "super")
      );

      return {
        fromUser: fromUserLike, // true если текущий пользователь лайкнул
        toUser: toUserLike, // true если другой пользователь лайкнул
      };
    } catch (error) {
      console.error("Error getting likes between users:", error);
      throw new Error("Failed to get likes between users");
    }
  }
}

export default new RecommendationService();
