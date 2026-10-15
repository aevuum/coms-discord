import { container } from "@sapphire/framework";

import { MessageFlags, type Message } from "discord.js";

import { Mana } from "../lib/mana.js";
import { SpellContainer } from "../lib/spellContainer.js";
import { ManaRepository } from "../repositories/manaRepository.js";
import type { CastResult } from "../types/spells.js";
import { SpellService } from "./spellService.js";

export class SpellCastService {
  private static readonly MAX_ATTEMPTS = 3;

  public static async handle(
    characterId: string,
    content: string,
    message: Message,
  ) {
    const spells = await SpellService.match(content);

    if (!spells.length) {
      return null;
    }

    const casts = spells.map((spell) => ({
      spell,
      manaCost: Mana.spellCost(spell),
    }));

    const totalCost = casts.reduce((sum, cast) => sum + cast.manaCost, 0);

    for (let attempt = 0; attempt < this.MAX_ATTEMPTS; attempt++) {
      const character = await ManaRepository.getCharacter(characterId);

      if (!character) {
        return null;
      }

      const stored = {
        mana: character.mana,
        maxMana: character.maxMana,
        manaUpdatedAt: character.manaUpdatedAt,
      };

      const regenerated = Mana.regenerate(stored);

      const manaAfter = regenerated.mana - totalCost;

      const applied = await ManaRepository.applyCast(
        characterId,
        stored,
        {
          mana: manaAfter,
          maxMana: character.maxMana,
          manaUpdatedAt: regenerated.manaUpdatedAt,
        },
        regenerated.mana,
        casts.map((cast) => ({
          spellId: cast.spell.id,
          spellName: cast.spell.name,
          manaCost: cast.manaCost,
        })),
        message.channelId,
        message.id,
      );

      if (!applied) {
        continue;
      }

      const result: CastResult = {
        characterName: character.rpName,
        spells: await Promise.all(
          casts.map(async (cast) => ({
            ...cast,
            imageUrl: await SpellService.getImage(cast.spell).catch(() => null),
          })),
        ),
        totalCost,
        manaAfter,
        maxMana: character.maxMana,
      };

      await this.announce(message, result);

      return result;
    }

    container.logger.warn(
      `Failed to apply spell cast for character ${characterId} after ${this.MAX_ATTEMPTS} attempts`,
    );

    return null;
  }

  private static async announce(message: Message, result: CastResult) {
    try {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [SpellContainer.cast(result)],
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
      });
    } catch (error) {
      container.logger.error(error);
    }
  }
}
