import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Race } from '../types/race.js';
import { RACES } from '../lib/race.js';

export class RaceService {
    public static rollRace(): Race {
        const totalWeight = RACES.reduce((sum, race) => sum + race.weight, 0);
        let random = Math.random() * totalWeight;

        for (const race of RACES) {
            if (random < race.weight) {
                return race;
            }
            random -= race.weight;
        }
        return RACES[0];
    }

    public static createEmbed(race: Race): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(0x475b56)
            .setTitle(`🟢 ${race.name} (${this.getStarsString(race.stars)})`)
            .setDescription(`★ "${race.description}"`)
            .setImage(race.image)
            .setTimestamp();
    }

    public static createButtonRow(): ActionRowBuilder<ButtonBuilder> {
        const button = new ButtonBuilder()
            .setCustomId('race:reroll')
            .setLabel('Перекрут')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄');

        return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    }

    private static getStarsString(stars: number): string {
        return '★'.repeat(stars) + '☆'.repeat(5 - stars);
    }
}