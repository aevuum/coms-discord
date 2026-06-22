import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

const ALLOWED_ROLES = (process.env.RACE_ALLOWED_ROLE_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

export class RaceRoller extends Precondition {
    public override async messageRun(message: Message) {
        return this.checkRole(message.member);
    }

    public override async chatInputRun(interaction: CommandInteraction) {
        return this.checkRole(interaction.member);
    }

    public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
        return this.checkRole(interaction.member);
    }

    private async checkRole(member: any) {
        if (ALLOWED_ROLES.length === 0) {
            return this.ok();
        }

        if (!member || typeof member === 'string') {
            return this.error({ message: 'Эта команда доступна только на сервере.' });
        }

        const roleIds = 'cache' in member.roles 
            ? [...member.roles.cache.keys()] 
            : member.roles;

        return ALLOWED_ROLES.some(role => roleIds.includes(role))
            ? this.ok()
            : this.error({ message: 'У вас нет прав для использования этой команды и кнопки перекрута!' });
    }
}