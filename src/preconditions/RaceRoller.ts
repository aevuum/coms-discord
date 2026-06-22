import { AllFlowsPrecondition } from '@sapphire/framework';
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message, GuildMember, APIInteractionGuildMember } from 'discord.js';

const ALLOWED_ROLES = (process.env.RACE_ALLOWED_ROLE_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

export class RaceRoller extends AllFlowsPrecondition {
    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        return this.checkRole(interaction.member);
    }

    public override async messageRun(_message: Message) {
        return this.ok();
    }

    public override async contextMenuRun(_interaction: ContextMenuCommandInteraction) {
        return this.ok();
    }

    private checkRole(member: GuildMember | APIInteractionGuildMember | string | null | undefined) {
        if (!member || typeof member === 'string') {
            return this.error({ message: 'Эта команда доступна только на сервере.' });
        }

        let roleIds: string[] = [];

        if ('cache' in member.roles) {
            roleIds = member.roles.cache.map(role => role.id);
        } else if (Array.isArray(member.roles)) {
            roleIds = member.roles;
        }

        if (ALLOWED_ROLES.some(role => roleIds.includes(role))) {
            return this.ok();
        }

        return this.error({ message: 'У вас нет прав для использования этой команды и кнопки перекрута!' });
    }
}