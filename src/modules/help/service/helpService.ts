import { basename, dirname } from "node:path";

import { container, type ChatInputCommand } from "@sapphire/framework";

import {
  ApplicationCommandOptionType,
  type ApplicationCommand,
  type ChatInputCommandInteraction,
} from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { HELP_CATEGORIES, HELP_FALLBACK_CATEGORY } from "../lib/helpCategories.js";
import type {
  HelpCategoryDefinition,
  HelpCommandEntry,
  HelpPage,
} from "../types/help.js";

export class HelpService {
  private static readonly MASK_PATTERN = /^[0-9a-z]{1,64}$/;

  private static applicationCommandsFetched = false;

  public static async getAccessMask(interaction: ChatInputCommandInteraction) {
    const commands = this.listCommands();

    await this.ensureApplicationCommands();

    let mask = 0n;

    for (const [index, command] of commands.entries()) {
      if (await this.canUse(interaction, command)) {
        mask |= 1n << BigInt(index);
      }
    }

    return mask.toString(36);
  }

  public static async getPage(mask: string, index: number): Promise<HelpPage> {
    await this.ensureApplicationCommands();

    const access = this.parseMask(mask);

    const entries = this.listCommands()
      .filter((_, position) => (access >> BigInt(position)) & 1n)
      .map((command) => this.toEntry(command));

    const pages = [...HELP_CATEGORIES, HELP_FALLBACK_CATEGORY]
      .map((category) => ({
        category,
        commands: entries.filter((entry) => entry.categoryId === category.id),
      }))
      .filter((page) => page.commands.length > 0);

    if (!pages.length) {
      throw new Error("No commands available");
    }

    const safeIndex = Number.isInteger(index)
      ? Math.min(Math.max(index, 0), pages.length - 1)
      : 0;

    return {
      pages,
      index: safeIndex,
      mask,
    };
  }

  private static listCommands(): ChatInputCommand[] {
    return [...container.stores.get("commands").values()]
      .filter((command): command is ChatInputCommand =>
        command.supportsChatInputCommands(),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private static async canUse(
    interaction: ChatInputCommandInteraction,
    command: ChatInputCommand,
  ) {
    try {
      if (!(await PermissionService.canUse(interaction, command.name))) {
        return false;
      }

      const result = await command.preconditions.chatInputRun(
        interaction,
        command,
        { external: true },
      );

      return result.isOk();
    } catch (error) {
      container.logger.error(error);
      return false;
    }
  }

  private static toEntry(command: ChatInputCommand): HelpCommandEntry {
    const applicationCommand = this.getApplicationCommand(command);

    const name = applicationCommand?.name ?? command.name;

    return {
      name,
      mention: applicationCommand
        ? `</${name}:${applicationCommand.id}>`
        : `\`/${name}\``,
      usage: this.usage(applicationCommand),
      description:
        applicationCommand?.description || command.description || "Без описания",
      categoryId: this.resolveCategory(command).id,
    };
  }

  private static resolveCategory(
    command: ChatInputCommand,
  ): HelpCategoryDefinition {
    const explicit = command.category;

    if (explicit) {
      return (
        HELP_CATEGORIES.find((category) => category.id === explicit) ??
        HELP_FALLBACK_CATEGORY
      );
    }

    const moduleName = basename(dirname(command.location.root));

    return (
      HELP_CATEGORIES.find((category) =>
        category.modules.includes(moduleName),
      ) ?? HELP_FALLBACK_CATEGORY
    );
  }

  private static usage(applicationCommand: ApplicationCommand | undefined) {
    const options = applicationCommand?.options ?? [];

    if (!options.length) {
      return null;
    }

    const subcommands = options.filter(
      (option) =>
        option.type === ApplicationCommandOptionType.Subcommand ||
        option.type === ApplicationCommandOptionType.SubcommandGroup,
    );

    if (subcommands.length) {
      return subcommands.map((option) => option.name).join(" | ");
    }

    return options
      .map((option) =>
        "required" in option && option.required
          ? `<${option.name}>`
          : `[${option.name}]`,
      )
      .join(" ");
  }

  private static getApplicationCommand(command: ChatInputCommand) {
    const cache = container.client.application?.commands.cache;

    if (!cache) {
      return undefined;
    }

    for (const id of command.applicationCommandRegistry
      .globalChatInputCommandIds) {
      const applicationCommand = cache.get(id);

      if (applicationCommand) {
        return applicationCommand;
      }
    }

    return cache.find(
      (applicationCommand) => applicationCommand.name === command.name,
    );
  }

  private static async ensureApplicationCommands() {
    const commands = container.client.application?.commands;

    if (!commands || this.applicationCommandsFetched || commands.cache.size) {
      return;
    }

    try {
      await commands.fetch();
      this.applicationCommandsFetched = true;
    } catch (error) {
      container.logger.error(error);
    }
  }

  private static parseMask(mask: string) {
    if (!this.MASK_PATTERN.test(mask)) {
      return 0n;
    }

    let value = 0n;

    for (const char of mask) {
      value = value * 36n + BigInt(parseInt(char, 36));
    }

    return value;
  }
}
