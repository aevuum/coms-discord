import type { BaseInteraction } from "discord.js";

import { AwardRarity } from "../../../database/generated/prisma/enums.js";
import { PermissionService } from "../../permissions/service/permissionService.js";
import { UserRepository } from "../../users/repositories/userRepository.js";
import { AwardRepository } from "../repositories/awardRepository.js";
import { AwardError, type AwardInput } from "../types/award.js";

export class AwardService {
  public static readonly MANAGE_KEY = "manage.awards";

  private static readonly MAX_COINS = 1_000_000;

  private static readonly CUSTOM_EMOJI = /^<a?:[a-zA-Z0-9_]+:\d+>$/;

  private static readonly UNICODE_EMOJI =
    /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Emoji_Component}|️|‍)+$/u;

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new AwardError("У вас нет доступа к управлению наградами.");
    }
  }

  public static async getAwards() {
    return AwardRepository.findAll();
  }

  public static async getAward(awardId: string) {
    const award = awardId ? await AwardRepository.findById(awardId) : null;

    if (!award) {
      throw new AwardError("Награда не найдена.");
    }

    return award;
  }

  public static async createAward(input: AwardInput) {
    const label = input.label.trim();

    if (label.length < 1 || label.length > 80) {
      throw new AwardError("Название должно быть от 1 до 80 символов.");
    }

    if (await AwardRepository.findByLabel(label)) {
      throw new AwardError("Награда с таким названием уже существует.");
    }

    const emoji = input.emoji.trim();

    if (!this.CUSTOM_EMOJI.test(emoji) && !this.UNICODE_EMOJI.test(emoji)) {
      throw new AwardError(
        "Некорректный эмодзи. Пример: 🏆 или <:name:123456789012345678>",
      );
    }

    const coinsText = input.coins.trim();

    if (!/^\d+$/.test(coinsText) || Number(coinsText) > this.MAX_COINS) {
      throw new AwardError(
        `Количество COMS должно быть целым числом от 0 до ${this.MAX_COINS}.`,
      );
    }

    const description = input.description.trim();

    if (description.length < 1 || description.length > 300) {
      throw new AwardError("Описание должно быть от 1 до 300 символов.");
    }

    const rarity = input.rarity as AwardRarity;

    if (!Object.values(AwardRarity).includes(rarity)) {
      throw new AwardError("Выберите редкость награды.");
    }

    return AwardRepository.create({
      label,
      emoji,
      description,
      rewardComsCoins: Number(coinsText),
      rarity,
    });
  }

  public static async deleteAward(awardId: string) {
    const award = await this.getAward(awardId);

    await AwardRepository.delete(award.id);

    return award;
  }

  public static async getUserAwards(discordId: string) {
    const user = await AwardRepository.findUserByDiscordId(discordId);

    if (!user) {
      return [];
    }

    return AwardRepository.findUserAwards(user.id);
  }

  public static async giveAward(discordId: string, awardId: string) {
    const user =
      (await AwardRepository.findUserByDiscordId(discordId)) ??
      (await UserRepository.create(discordId));

    const award = await this.getAward(awardId);

    if (await AwardRepository.findUserAward(user.id, award.id)) {
      throw new AwardError("У игрока уже есть эта награда.");
    }

    await AwardRepository.grant(user.id, user.walletId, award);

    return award;
  }

  public static async removeAward(discordId: string, awardId: string) {
    const user = await AwardRepository.findUserByDiscordId(discordId);

    if (!user) {
      throw new AwardError("У игрока нет наград.");
    }

    const award = await this.getAward(awardId);

    if (!(await AwardRepository.findUserAward(user.id, award.id))) {
      throw new AwardError("У игрока нет этой награды.");
    }

    const deducted = await AwardRepository.revoke(user.id, user.walletId, award);

    return {
      ...award,
      deducted,
    };
  }
}
