import { Command } from '@sapphire/framework';
import { RaceService } from '../services/raceService.js';

export class RaceRollCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'race',
            description: 'Прокрутить расу',
            preconditions: ['RaceRoller'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const race = RaceService.rollRace();
        const embed = RaceService.createEmbed(race);
        const row = RaceService.createButtonRow();

        await interaction.reply({ embeds: [embed], components: [row] });
    }
}