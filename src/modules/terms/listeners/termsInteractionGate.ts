import { Events, Listener } from "@sapphire/framework";
import {
  MessageFlags,
  type ButtonInteraction,
  type Interaction,
  type RepliableInteraction,
} from "discord.js";

import { TermsAction, TermsCustomIds } from "../lib/termsConfig.js";
import { TermsContainer } from "../lib/termsContainer.js";
import { TermsService } from "../service/termsService.js";

const EXEMPT_COMMANDS = new Set(["terms"]);

export class TermsInteractionGateListener extends Listener<typeof Events.InteractionCreate> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      name: "CoreInteractionCreate",
      event: Events.InteractionCreate,
    });
  }

  public override async run(interaction: Interaction) {
    if (interaction.isButton()) {
      const action = TermsCustomIds.parse(interaction.customId);

      if (action) {
        await this.handleTermsButton(interaction, action);
        return;
      }
    }

    if (!(await this.allowed(interaction))) {
      await this.prompt(interaction as RepliableInteraction);
      return;
    }

    if (interaction.isChatInputCommand()) {
      this.container.client.emit(Events.PossibleChatInputCommand, interaction);
    } else if (interaction.isContextMenuCommand()) {
      this.container.client.emit(Events.PossibleContextMenuCommand, interaction);
    } else if (interaction.isAutocomplete()) {
      this.container.client.emit(Events.PossibleAutocompleteInteraction, interaction);
    } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
      await this.container.stores.get("interaction-handlers").run(interaction);
    }
  }

  private async allowed(interaction: Interaction) {
    if (interaction.user.bot || interaction.isAutocomplete() || interaction.isModalSubmit()) {
      return true;
    }

    if (interaction.isCommand() && EXEMPT_COMMANDS.has(interaction.commandName)) {
      return true;
    }

    if (!interaction.isCommand() && !interaction.isMessageComponent()) {
      return true;
    }

    try {
      return await TermsService.hasAccepted(interaction.user.id);
    } catch (error) {
      this.container.logger.error(error);

      return true;
    }
  }

  private async prompt(interaction: RepliableInteraction) {
    await interaction
      .reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [TermsContainer.prompt()],
      })
      .catch((error) => this.container.logger.error(error));
  }

  private async handleTermsButton(interaction: ButtonInteraction, action: TermsAction) {
    try {
      switch (action) {
        case TermsAction.Accept:
          await TermsService.accept(interaction.user.id);
          return await this.respond(interaction, TermsContainer.accepted());

        case TermsAction.Decline:
          return await this.respond(interaction, TermsContainer.declined());

        case TermsAction.Withdraw:
          return await this.respond(interaction, TermsContainer.withdrawConfirm());

        case TermsAction.WithdrawConfirm:
          await TermsService.withdraw(interaction.user.id);
          return await this.respond(interaction, TermsContainer.withdrawn());

        case TermsAction.WithdrawCancel:
          return await this.respond(
            interaction,
            TermsContainer.overview(await TermsService.acceptedAt(interaction.user.id)),
          );
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }

  private async respond(interaction: ButtonInteraction, container: ReturnType<typeof TermsContainer.accepted>) {
    await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }
}
