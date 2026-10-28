import { container } from "@sapphire/framework";

import type { BaseInteraction, GuildMember, Message } from "discord.js";

import { HousePointsSource } from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { SCHEDULE_TEACH_KEY } from "../../schedule/types/schedule.js";
import { PointsParser } from "../lib/pointsParser.js";
import { PointsRepository } from "../repositories/pointsRepository.js";
import {
  HOUSE_EMOJIS,
  POINTS_AWARD_KEY,
  POINTS_MANAGE_KEY,
  POINTS_MAX_DELTA,
  PointsError,
  type House,
  type PointsChange,
} from "../types/points.js";
import { PointsBoard } from "./pointsBoard.js";

const emojiId = (emoji: string) => /:(\w+:\d+)>$/.exec(emoji)?.[1] ?? emoji;

export class PointsService {
  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, POINTS_MANAGE_KEY))) {
      throw new PointsError("У вас нет доступа к очкам факультетов.");
    }

    return subject.guildId;
  }

  public static async handleMessage(message: Message) {
    if (!message.inGuild() || !message.member || message.guildId !== process.env.GUILD_ID) {
      return;
    }

    const changes = PointsParser.parse(message.content);

    if (!changes.length || !(await this.allowed(message.member, [POINTS_AWARD_KEY]))) {
      return;
    }

    await this.award(changes, message.guildId, message.author.id, HousePointsSource.MESSAGE, message);
  }

  public static async handleTupper(source: Message, sent: Message, content: string) {
    if (!source.inGuild() || !source.member || source.guildId !== process.env.GUILD_ID) {
      return;
    }

    const changes = PointsParser.parse(content);

    if (!changes.length || !(await this.allowed(source.member, [SCHEDULE_TEACH_KEY, POINTS_AWARD_KEY]))) {
      return;
    }

    await this.award(changes, source.guildId, source.author.id, HousePointsSource.TUPPER, sent);
  }

  public static async revert(messageId: string) {
    const reverted = await PointsRepository.revert(messageId);

    if (reverted.length) {
      PointsBoard.schedule();
    }

    return reverted;
  }

  public static async adjust(guildId: string, actorId: string, faculty: House, input: string, note: string) {
    const delta = Number(input.replace(/[\s−–]/g, (char) => (char.trim() ? "-" : "")));

    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > POINTS_MAX_DELTA) {
      throw new PointsError(`Укажите целое число от -${POINTS_MAX_DELTA} до ${POINTS_MAX_DELTA}, например «+10» или «-5».`);
    }

    await PointsRepository.apply([{ faculty, delta }], {
      guildId,
      actorId,
      source: HousePointsSource.MANUAL,
      messageId: null,
      channelId: null,
      note: note.trim().slice(0, 200) || null,
    });

    PointsBoard.schedule();

    return delta;
  }

  public static async reset() {
    await PointsRepository.reset();
    PointsBoard.schedule();
  }

  private static async allowed(member: GuildMember, keys: string[]) {
    const subject = { guildId: member.guild.id, member, memberPermissions: member.permissions };

    for (const key of keys) {
      if (await PermissionService.canUse(subject, key)) {
        return true;
      }
    }

    return false;
  }

  private static async award(changes: PointsChange[], guildId: string, actorId: string, source: HousePointsSource, message: Message) {
    const applied = await PointsRepository.apply(changes, {
      guildId,
      actorId,
      source,
      messageId: message.id,
      channelId: message.channelId,
      note: message.content.slice(0, 200) || null,
    });

    if (!applied.length) {
      return;
    }

    for (const change of applied) {
      await message.react(emojiId(HOUSE_EMOJIS[change.faculty])).catch(() => message.react("✅").catch(() => null));
    }

    container.logger.info(`House points ${applied.map((change) => `${change.faculty} ${change.delta}`).join(", ")} by ${actorId}`);

    PointsBoard.schedule();
  }
}
