import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { EconomyAction, EconomyCustomIds } from "../lib/economyCustomIds.js";
import { EconomyContainer } from "../lib/economyContainer.js";
import { EconomyService } from "../services/economyService.js";
import { EconomyComponents } from "../lib/economyComponents.js";

export class EconomyButtonHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed) return this.none();

    if (
      parsed.action !== EconomyAction.Transfer &&
      parsed.action !== EconomyAction.History &&
      parsed.action !== EconomyAction.Back
    )
      return this.none();

    return this.some({
      action: parsed.action,
      args: parsed.args,
    });
  }

  public override async run(interaction: ButtonInteraction, result: any) {
    switch (result.action) {
      case EconomyAction.Back: {
        const characters = await EconomyService.getCharacters(
          interaction.user.id,
        );

        if (characters.length === 1) {
          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [EconomyContainer.main(characters[0])],
          });
          return;
        }

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            EconomyContainer.selectCharacter(
              characters
                .map((c) => ({ id: c.id, rpName: c.rpName }))
                .slice(0, 25),
            ),
          ],
        });

        return;
      }

      case EconomyAction.Transfer: {
        const senderId = result.args[0];

        const users = await EconomyService.getTransferUsers(
          interaction.user.id,
        );

        const usersWithNames: {
          id: string;
          discordId: string;
          username: string;
          characters: {
            id: string;
            rpName: string;
          }[];
        }[] = await Promise.all(
          users.map(async (user) => {
            const member = await interaction.guild?.members
              .fetch(user.discordId)
              .catch(() => null);

            return {
              ...user,
              username:
                member?.displayName ??
                member?.user.username ??
                "Неизвестный пользователь",
            };
          }),
        );

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            EconomyComponents.transferUserSelect(usersWithNames, senderId),
            EconomyComponents.back(),
          ],
        });

        return;
      }

      case EconomyAction.History: {
        const characterId = result.args[0];

        const character = await EconomyService.getOwnedCharacter(
          interaction.user.id,
          characterId,
        );

        const history = await EconomyService.history(
          interaction.user.id,
          characterId,
        );

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [EconomyContainer.history(character, history)],
        });

        return;
      }
    }
  }
}
