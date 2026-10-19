import { container } from "@sapphire/framework";
import { AttachmentBuilder, MessageFlags, type Client } from "discord.js";

import { CoinTransactionType } from "../../../database/generated/prisma/client.js";

import { StipendSchedule } from "../../coins/lib/stipendSchedule.js";
import { CoinRepository } from "../../coins/repositories/coinRepository.js";
import { CoinService } from "../../coins/service/coinService.js";
import { ActivityContainer } from "../lib/activityContainer.js";
import { TOP_BANNER_NAME, TopBanner } from "../lib/topBanner.js";
import { ActivityRepository, type ActivityRow } from "../repositories/activityRepository.js";

export const TOP_PAGE_SIZE = 10;

export type ActivityRewards = [number, number, number];

export class ActivityService {
  public static async getPage(page: number, viewerId: string) {
    const total = await ActivityRepository.count();

    const totalPages = Math.max(1, Math.ceil(total / TOP_PAGE_SIZE));

    const safePage = Number.isInteger(page) ? Math.min(Math.max(page, 0), totalPages - 1) : 0;

    return {
      rows: await ActivityRepository.page(safePage * TOP_PAGE_SIZE, TOP_PAGE_SIZE),
      page: safePage,
      totalPages,
      total,
      viewer: await ActivityRepository.position(viewerId),
      rewards: await this.getRewards(),
      resetAt: StipendSchedule.nextPayout(),
    };
  }

  public static async getMessage(client: Client, page: number, viewerId: string) {
    const view = await this.getPage(page, viewerId);

    const leaders = view.page === 0 ? view.rows.slice(0, 3) : await ActivityRepository.page(0, 3);

    const banner = await TopBanner.render(client, leaders).catch((error) => {
      container.logger.error(error);
      return null;
    });

    return {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [ActivityContainer.top(view, TOP_PAGE_SIZE, banner ? TOP_BANNER_NAME : null)],
      files: banner ? [new AttachmentBuilder(banner, { name: TOP_BANNER_NAME })] : [],
      allowedMentions: { parse: [] },
    };
  }

  public static async getRewards(): Promise<ActivityRewards> {
    const settings = await ActivityRepository.getSettings(this.guildId());

    return [settings.rewardFirst, settings.rewardSecond, settings.rewardThird];
  }

  public static async setRewards(inputs: [string, string, string]) {
    const [first, second, third] = inputs.map((input) =>
      input.trim() ? CoinService.parseAmount(input) : 0,
    );

    await ActivityRepository.updateRewards(this.guildId(), {
      rewardFirst: first,
      rewardSecond: second,
      rewardThird: third,
    });

    return this.getRewards();
  }

  public static async runDue(client: Client, now = new Date()) {
    const guildId = this.guildId();

    const settings = await ActivityRepository.getSettings(guildId);

    if (!settings.lastResetAt) {
      await ActivityRepository.claimReset(guildId, null, now);
      return null;
    }

    if (!StipendSchedule.isDue(settings.lastResetAt, now)) {
      return null;
    }

    if (!(await ActivityRepository.claimReset(guildId, settings.lastResetAt, now))) {
      return null;
    }

    const winners = await ActivityRepository.page(0, 3);

    const rewards: ActivityRewards = [settings.rewardFirst, settings.rewardSecond, settings.rewardThird];

    for (const [index, winner] of winners.entries()) {
      const amount = rewards[index];

      if (amount <= 0) {
        continue;
      }

      try {
        await CoinRepository.adjust(
          winner.discordId,
          amount,
          CoinTransactionType.ACTIVITY_REWARD,
          `${index + 1} место в недельном рейтинге активности`,
        );

        await this.notifyWinner(client, winner, index + 1, amount);
      } catch (error) {
        container.logger.error(error);
      }
    }

    await ActivityRepository.resetWeek();

    return winners;
  }

  private static async notifyWinner(client: Client, winner: ActivityRow, place: number, amount: number) {
    const user = await client.users.fetch(winner.discordId).catch(() => null);

    await user
      ?.send({
        flags: MessageFlags.IsComponentsV2,
        components: [ActivityContainer.winnerNotice(place, amount, winner)],
      })
      .catch(() => null);
  }

  private static guildId() {
    const guildId = process.env.GUILD_ID;

    if (!guildId) {
      throw new Error("GUILD_ID is not set");
    }

    return guildId;
  }
}
