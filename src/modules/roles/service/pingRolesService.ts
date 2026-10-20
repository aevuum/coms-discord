import {
  MessageFlags,
  PermissionFlagsBits,
  type BaseInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type Message,
} from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import {
  PING_ROLE_SEED,
  PING_ROLES_CHANNEL_ID,
  PING_ROLES_MAX,
  PingRolesCustomIds,
} from "../lib/pingRoles.js";
import { PingRolesContainer } from "../lib/pingRolesContainer.js";
import { PingRoleRepository, type PingRoleData } from "../repositories/pingRoleRepository.js";

const DANGEROUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageNicknames,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.ManageEvents,
  PermissionFlagsBits.ManageGuildExpressions,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.MuteMembers,
  PermissionFlagsBits.DeafenMembers,
  PermissionFlagsBits.ViewAuditLog,
];

const CUSTOM_EMOJI = /^<a?:\w{2,32}:\d{17,20}>$/;
const UNICODE_EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]️?⃣)/u;

export class PingRoleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PingRoleError";
  }
}

export class PingRolesService {
  public static readonly MANAGE_KEY = "manage.pingroles";

  public static guildId() {
    return process.env.GUILD_ID ?? "";
  }

  public static list() {
    return PingRoleRepository.list(this.guildId());
  }

  public static async seed() {
    if (await PingRoleRepository.count(this.guildId())) {
      return 0;
    }

    const result = await PingRoleRepository.createMany(
      this.guildId(),
      PING_ROLE_SEED.map((role) => ({
        roleId: role.id,
        label: role.label,
        emoji: role.emoji,
        description: role.description,
      })),
    );

    return result.count;
  }

  public static async ensureListed(roleId: string, data: PingRoleData) {
    await this.seed();

    if (await PingRoleRepository.find(roleId)) {
      return false;
    }

    await PingRoleRepository.create(this.guildId(), roleId, this.normalize(data));

    return true;
  }

  public static async apply(member: GuildMember, wanted: string[]) {
    const allowed = new Set((await this.list()).map((role) => role.roleId));

    const selected = new Set(wanted.filter((id) => allowed.has(id)));

    const added = [...selected].filter((id) => !member.roles.cache.has(id));

    const removed = [...allowed].filter(
      (id) => !selected.has(id) && member.roles.cache.has(id),
    );

    if (added.length) {
      await member.roles.add(added, "Выбор пинг-ролей");
    }

    if (removed.length) {
      await member.roles.remove(removed, "Выбор пинг-ролей");
    }

    return {
      added,
      removed,
      current: [...allowed].filter((id) => selected.has(id)),
    };
  }

  public static async panelPayload() {
    return {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [PingRolesContainer.panel(await this.list())],
      allowedMentions: { parse: [] },
    };
  }

  public static async syncPanel(client: Client<true>) {
    const channel = await client.channels.fetch(PING_ROLES_CHANNEL_ID);

    if (!channel?.isSendable() || !channel.isTextBased()) {
      throw new Error(`Ping roles channel ${PING_ROLES_CHANNEL_ID} is not a text channel`);
    }

    const payload = await this.panelPayload();

    const messages = await channel.messages.fetch({ limit: 50 });

    const existing = messages.find(
      (message) => message.author.id === client.user.id && this.isPanel(message),
    );

    if (existing) {
      await existing.edit(payload);

      return { message: existing, created: false };
    }

    return { message: await channel.send(payload), created: true };
  }

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new PingRoleError("У вас нет доступа к настройке пинг-ролей.");
    }
  }

  public static getGuild(client: Client) {
    const guild = client.guilds.cache.get(this.guildId());

    if (!guild) {
      throw new PingRoleError("Сервер бота недоступен.");
    }

    return guild;
  }

  public static async get(roleId: string) {
    const role = await PingRoleRepository.find(roleId);

    if (!role) {
      throw new PingRoleError("Эта роль уже убрана с панели.");
    }

    return role;
  }

  public static async assertAddable(guild: Guild, roleId: string) {
    if (await PingRoleRepository.find(roleId)) {
      throw new PingRoleError("Эта роль уже есть на панели.");
    }

    if ((await PingRoleRepository.count(guild.id)) >= PING_ROLES_MAX) {
      throw new PingRoleError(`На панели может быть не больше ${PING_ROLES_MAX} ролей.`);
    }

    const role = await guild.roles.fetch(roleId).catch(() => null);

    if (!role || role.id === guild.id) {
      throw new PingRoleError("Роль не найдена.");
    }

    if (role.managed) {
      throw new PingRoleError("Эта роль управляется интеграцией или ботом, её нельзя выдавать вручную.");
    }

    if (DANGEROUS_PERMISSIONS.some((permission) => role.permissions.has(permission, false))) {
      throw new PingRoleError(
        "У этой роли есть права модерации или управления. Такие роли нельзя выдавать через панель: любой участник смог бы получить их сам.",
      );
    }

    const me = guild.members.me ?? (await guild.members.fetchMe());

    if (role.position >= me.roles.highest.position) {
      throw new PingRoleError("Роль бота должна быть выше этой роли в списке ролей сервера, иначе бот не сможет её выдавать.");
    }

    return role;
  }

  public static async add(client: Client<true>, roleId: string, data: PingRoleData) {
    const guild = this.getGuild(client);

    await this.assertAddable(guild, roleId);

    await PingRoleRepository.create(guild.id, roleId, this.normalize(data));

    await this.syncPanel(client);
  }

  public static async edit(client: Client<true>, roleId: string, data: PingRoleData) {
    await this.get(roleId);

    await PingRoleRepository.update(roleId, this.normalize(data));

    await this.syncPanel(client);
  }

  public static async move(client: Client<true>, roleId: string, offset: number) {
    const roles = await this.list();
    const index = roles.findIndex((role) => role.roleId === roleId);
    const target = index + offset;

    if (index < 0) {
      throw new PingRoleError("Эта роль уже убрана с панели.");
    }

    if (target < 0 || target >= roles.length) {
      return;
    }

    const ids = roles.map((role) => role.roleId);

    [ids[index], ids[target]] = [ids[target], ids[index]];

    await PingRoleRepository.reorder(ids);

    await this.syncPanel(client);
  }

  public static async remove(client: Client<true>, roleId: string) {
    await PingRoleRepository.delete(roleId);

    await this.syncPanel(client);
  }

  private static normalize(data: PingRoleData): PingRoleData {
    const label = data.label.replace(/\s+/g, " ").trim();

    if (!label) {
      throw new PingRoleError("Укажите название для панели.");
    }

    const emoji = data.emoji?.trim() || null;

    if (emoji && !CUSTOM_EMOJI.test(emoji) && !UNICODE_EMOJI.test(emoji)) {
      throw new PingRoleError("Эмодзи должен быть обычным эмодзи (например 🎉) или эмодзи сервера в формате <:имя:id>.");
    }

    return {
      label: label.slice(0, 80),
      emoji,
      description: data.description?.replace(/\s+/g, " ").trim().slice(0, 100) || null,
    };
  }

  private static isPanel(message: Message) {
    return JSON.stringify(message.components.map((component) => component.toJSON())).includes(
      `"${PingRolesCustomIds.select}"`,
    );
  }
}
