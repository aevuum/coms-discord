import {
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";

import {
  Character,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";

import type {
  CharacterOption,
  HistoryPage,
  TransferPreview,
  TransferResult,
} from "../types/economy.js";

import { Currency } from "./currency.js";
import { EconomyComponents } from "./economyComponents.js";
import { CharacterFormatter } from "./characterFormatter.js";
import { TransactionFormatter } from "./transactionFormatter.js";
import { Storage } from "../../../lib/storage.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";

export class EconomyContainer {
  public static overview(characters: Character[]) {
    if (characters.length === 1) {
      return this.main(characters[0], false);
    }

    return this.selectCharacter(characters);
  }

  public static selectCharacter(characters: CharacterOption[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:16874shopcyan:1518587268154134569> Экономика",
          "",
          `${ARROW} Выберите персонажа, чтобы открыть его кошелек.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      EconomyComponents.characterSelect(characters),
    );

    return container;
  }

  public static main(character: Character, showBack: boolean) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    this.addHeader(
      container,
      [
        `# <:16874shopcyan:1518587268154134569> ${character.rpName}`,
        "",
        `${ARROW} Факультет: ${CharacterFormatter.faculty(character.faculty)}`,
        `${ARROW} Статус: ${CharacterFormatter.status(character.status)}`,
      ].join("\n"),
      Storage.media(character.avatarPath, character.avatarUrl),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## <:60544bpldl:1518587299720335501> Баланс",
          "",
          Currency.format(character.balanceKnuts),
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      EconomyComponents.main(
        character.id,
        character.status === CharacterStatus.ALIVE,
      ),
    );

    if (showBack) {
      container.addActionRowComponents(EconomyComponents.backToSelection());
    }

    return container;
  }

  public static selectTransferUser(sender: Character) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:26828shopgreen:1518587281349415084> Передача денег",
          "",
          `${ARROW} Отправитель: **${sender.rpName}**`,
          `${ARROW} Доступно: ${Currency.inline(sender.balanceKnuts)}`,
          "",
          `${ARROW} Выберите игрока, которому хотите передать деньги.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      EconomyComponents.transferUserSelect(sender.id),
    );

    container.addActionRowComponents(
      EconomyComponents.backToCharacter(sender.id),
    );

    return container;
  }

  public static selectTransferCharacter(
    sender: Character,
    receiverDiscordId: string,
    characters: CharacterOption[],
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:26828shopgreen:1518587281349415084> Передача денег",
          "",
          `${ARROW} Отправитель: **${sender.rpName}**`,
          `${ARROW} Игрок: <@${receiverDiscordId}>`,
          "",
          `${ARROW} Выберите персонажа получателя.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      EconomyComponents.transferCharacterSelect(sender.id, characters),
    );

    container.addActionRowComponents(
      EconomyComponents.backToCharacter(sender.id),
    );

    return container;
  }

  public static transferConfirm(preview: TransferPreview) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:26828shopgreen:1518587281349415084> Подтверждение перевода",
          "",
          `${ARROW} Отправитель: **${preview.sender.rpName}**`,
          `${ARROW} Получатель: **${preview.receiver.rpName}**`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## <:60544bpldl:1518587299720335501> Сумма",
          "",
          Currency.format(preview.amountKnuts),
          "",
          `-# Баланс после перевода: ${Currency.short(
            preview.sender.balanceKnuts - preview.amountKnuts,
          )}`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      EconomyComponents.transferConfirm(
        preview.sender.id,
        preview.receiver.id,
        preview.amountKnuts,
      ),
    );

    return container;
  }

  public static transferSuccess(result: TransferResult) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:766839verifiedgreen:1518587368636944534> Перевод выполнен",
          "",
          `${ARROW} **${result.sender.rpName}** → **${result.receiver.rpName}**`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## <:60544bpldl:1518587299720335501> Сумма",
          "",
          Currency.format(result.amountKnuts),
          "",
          `-# Остаток на счёте: ${Currency.short(result.sender.balanceKnuts)}`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      EconomyComponents.backToCharacter(result.sender.id),
    );

    return container;
  }

  public static history(history: HistoryPage) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:988044dots:1518581053642772621> История операций",
          "",
          `${ARROW} Персонаж: **${history.character.rpName}**`,
          `-# Страница ${history.page + 1} из ${history.totalPages}`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        history.transactions.length
          ? history.transactions
              .map((transaction) => TransactionFormatter.entry(transaction))
              .join("\n\n")
          : `${ARROW} Операций пока нет.`,
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      EconomyComponents.historyNavigation(
        history.character.id,
        history.page,
        history.totalPages,
      ),
    );

    return container;
  }

  public static error(
    message: string,
    backCharacterId?: string,
    showBack = true,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:240191mark:1518581039172292688> Ошибка",
          "",
          `${ARROW} ${message}`,
        ].join("\n"),
      ),
    );

    if (!showBack) {
      return container;
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      backCharacterId
        ? EconomyComponents.backToCharacter(backCharacterId)
        : EconomyComponents.backToSelection(),
    );

    return container;
  }

  private static addHeader(
    container: ContainerBuilder,
    content: string,
    avatarUrl: string | null,
  ) {
    const text = new TextDisplayBuilder().setContent(content);

    if (!avatarUrl) {
      container.addTextDisplayComponents(text);
      return;
    }

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(text)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl)),
    );
  }
}
