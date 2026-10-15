import {
  Precondition,
  type ChatInputCommand,
  type ContextMenuCommand,
} from "@sapphire/framework";

import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
} from "discord.js";

import { PermissionService } from "../service/permissionService.js";

export class CommandAccessPrecondition extends Precondition {
  public constructor(
    context: Precondition.LoaderContext,
    options: Precondition.Options,
  ) {
    super(context, {
      ...options,
      position: 20,
    });
  }

  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
    command: ChatInputCommand,
  ) {
    return this.check(interaction, command.name);
  }

  public override async contextMenuRun(
    interaction: ContextMenuCommandInteraction,
    command: ContextMenuCommand,
  ) {
    return this.check(interaction, command.name);
  }

  public override messageRun() {
    return this.ok();
  }

  private async check(
    interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction,
    commandName: string,
  ) {
    const allowed = await PermissionService.canUse(interaction, commandName);

    return allowed
      ? this.ok()
      : this.error({
          identifier: "CommandAccessDenied",
          message: "У вас нет доступа к этой команде.",
        });
  }
}
