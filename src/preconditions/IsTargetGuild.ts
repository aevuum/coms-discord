import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

export class IsTargetGuild extends Precondition {
  public override async messageRun(message: Message) {
    return this.checkGuild(message.guildId);
  }

  public override async chatInputRun(interaction: CommandInteraction) {
    return this.checkGuild(interaction.guildId);
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.checkGuild(interaction.guildId);
  }

  private async checkGuild(guildId: string | null) {
    return guildId === process.env.GUILD_ID
      ? this.ok()
      : this.error({ message: 'Этот бот работает только на одном конкретном сервере.' });
  }
}