import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { RaceService } from '../../services/raceService.js';

const ALLOWED_ROLES = (process.env.RACE_ALLOWED_ROLE_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

export class RaceRerollButton extends InteractionHandler {
    public constructor(context: InteractionHandler.Context, options: InteractionHandler.Options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (interaction.customId === 'race:reroll') {
            return this.some();
        }
        return this.none();
    }

    public override async run(interaction: ButtonInteraction) {
        const member = interaction.member;

        if (!member || typeof member === 'string' || !('roles' in member)) {
            await interaction.reply({ content: 'Эта команда доступна только на сервере.', ephemeral: true });
            return;
        }

        const roleIds = 'cache' in member.roles ? member.roles.cache.map(r => r.id) : member.roles;

        if (!ALLOWED_ROLES.some(role => roleIds.includes(role))) {
            await interaction.reply({ content: 'У вас нет прав для использования кнопки перекрута!', ephemeral: true });
            return;
        }

        const race = RaceService.rollRace();
        const embed = RaceService.createEmbed(race);
        const row = RaceService.createButtonRow();

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }
}