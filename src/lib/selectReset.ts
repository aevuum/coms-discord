import {
  MessageFlags,
  type AnySelectMenuInteraction,
  type InteractionEditReplyOptions,
  type Message,
} from "discord.js";

type Rebuild = (interaction: AnySelectMenuInteraction) => Promise<InteractionEditReplyOptions>;

const ATTACHMENT_URL = /(cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\//;

export class SelectReset {
  private static rebuilders = new Map<string, Rebuild>();

  public static register(customIdPrefix: string, rebuild: Rebuild) {
    this.rebuilders.set(customIdPrefix, rebuild);
  }

  public static async reset(interaction: AnySelectMenuInteraction) {
    const { message } = interaction;

    if (message.flags.has(MessageFlags.Ephemeral)) {
      return false;
    }

    const rebuild = [...this.rebuilders.entries()].find(([prefix]) =>
      interaction.customId.startsWith(prefix),
    )?.[1];

    if (rebuild) {
      await interaction.deferUpdate();
      await interaction.editReply(await rebuild(interaction));

      return true;
    }

    const components = message.components.map((component) => component.toJSON());

    if (ATTACHMENT_URL.test(JSON.stringify(components))) {
      return false;
    }

    await interaction.update({
      ...(this.isV2(message) ? { flags: MessageFlags.IsComponentsV2 as const } : {}),
      components,
      allowedMentions: { parse: [] },
    });

    return true;
  }

  private static isV2(message: Message) {
    return message.flags.has(MessageFlags.IsComponentsV2);
  }
}
