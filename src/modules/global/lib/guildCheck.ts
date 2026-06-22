import type { ButtonInteraction, AnySelectMenuInteraction } from 'discord.js';

export function isTargetGuild(interaction: ButtonInteraction | AnySelectMenuInteraction): boolean {
  return interaction.guildId === process.env.GUILD_ID;
}

export async function denyGuildAccess(interaction: ButtonInteraction | AnySelectMenuInteraction) {
  const reply = { content: 'Этот бот работает только на одном конкретном сервере.', ephemeral: true };

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(reply);
  }
  return interaction.reply(reply);
}