import { AwardRarity } from "../../../database/generated/prisma/enums.js";
import { AwardRepository } from "../repositories/awardRepository.js";

export class AwardService {
  public static async createAward(data: {
    label: string;
    emoji: string;
    description: string;
    rewardComsCoins: number;
    rarity: AwardRarity;
  }) {
    const existing = await AwardRepository.findByLabel(data.label);

    if (existing) {
      throw new Error("Награда с таким названием уже существует.");
    }

    return AwardRepository.create(data);
  }

  public static async deleteAward(label: string) {
    const award = await AwardRepository.findByLabel(label);

    if (!award) {
      throw new Error("Награда не найдена.");
    }

    await AwardRepository.delete(award.id);

    return award;
  }

  public static async getAwards() {
    return AwardRepository.findAll();
  }

  public static async giveAward(discordId: string, awardLabel: string) {
    const user = await AwardRepository.findUserByDiscordId(discordId);

    if (!user) {
      throw new Error("Пользователь не найден.");
    }

    const award = await AwardRepository.findByLabel(awardLabel);

    if (!award) {
      throw new Error("Награда не найдена.");
    }

    const existing = await AwardRepository.findUserAward(user.id, award.id);

    if (existing) {
      throw new Error("У пользователя уже есть эта награда.");
    }

    await AwardRepository.transaction([
      AwardRepository.createUserAward(user.id, award.id) as any,
      AwardRepository.addCoins(user.walletId, award.rewardComsCoins) as any,
    ]);

    return award;
  }

  public static async removeAward(discordId: string, awardLabel: string) {
    const user = await AwardRepository.findUserByDiscordId(discordId);

    if (!user) {
      throw new Error("Пользователь не найден.");
    }

    const award = await AwardRepository.findByLabel(awardLabel);

    if (!award) {
      throw new Error("Награда не найдена.");
    }

    const existing = await AwardRepository.findUserAward(user.id, award.id);

    if (!existing) {
      throw new Error("У пользователя нет этой награды.");
    }

    await AwardRepository.transaction([
      AwardRepository.deleteUserAward(user.id, award.id) as any,
      AwardRepository.removeCoins(user.walletId, award.rewardComsCoins) as any,
    ]);

    return award;
  }
}
