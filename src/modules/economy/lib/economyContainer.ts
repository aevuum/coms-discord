import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";

import { Character } from "../../../database/generated/prisma/client.js";

import { Currency } from "./currency.js";
import { EconomyComponents } from "./economyComponents.js";
import { CharacterFormatter } from "./characterFormatter.js";

export class EconomyContainer {
  public static selectCharacter(
    characters: {
      id: string;
      rpName: string;
    }[],
  ) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:16874shopcyan:1518587268154134569> Экономика",
          "",
          "<:48765whitearrow:1518587298281685173> Выберите персонажа, чтобы открыть его кошелек.",
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

  public static main(character: Character) {
    const container = new ContainerBuilder();

    const section = new SectionBuilder({
      accessory: character.avatarUrl
        ? {
            type: 11,
            media: {
              url: character.avatarUrl,
            },
          }
        : undefined,
    }).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# <:16874shopcyan:1518587268154134569> ${character.rpName}`,
          "",
          ` <:48765whitearrow:1518587298281685173> Факультет: ${CharacterFormatter.faculty(character.faculty)}`,
        ].join("\n"),
      ),
    );
    container.addSectionComponents(section);

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

    container.addActionRowComponents(EconomyComponents.main(character.id));

    container.addActionRowComponents(EconomyComponents.back());

    return container;
  }

  public static selectReceiver(
    character: Character,
    characters: {
      id: string;
      rpName: string;
    }[],
  ) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:26828shopgreen:1518587281349415084> Передача денег",
          "",
          ` <:48765whitearrow:1518587298281685173> Отправитель: **${character.rpName}**`,
          "",
          " <:48765whitearrow:1518587298281685173> Выберите персонажа, которому хотите передать деньги.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(EconomyComponents.back());

    return container;
  }

  public static selectTransferCharacter(
    characters: {
      id: string;
      rpName: string;
    }[],
    senderId: string,
  ) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:26828shopgreen:1518587281349415084> Передача денег",
          "",
          " <:48765whitearrow:1518587298281685173> Выберите персонажа получателя.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      EconomyComponents.transferCharacterSelect(senderId, characters),
    );

    return container;
  }

  public static history(
    character: Character,
    history: {
      amountKnuts: number;
      reason: string | null;
      createdAt: Date;
    }[],
  ) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:988044dots:1518581053642772621> История операций",
          "",
          ` <:48765whitearrow:1518587298281685173> Персонаж: **${character.rpName}**`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (!history.length) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          " <:48765whitearrow:1518587298281685173> Операций пока нет.",
        ),
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          history
            .map((transaction) => {
              const sign = transaction.amountKnuts >= 0 ? "+" : "-";

              const amount = Currency.short(Math.abs(transaction.amountKnuts));

              return [
                `${sign}${amount}`,
                transaction.reason ?? "Без причины",
                `<t:${Math.floor(transaction.createdAt.getTime() / 1000)}:R>`,
              ].join(" • ");
            })
            .join("\n"),
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(EconomyComponents.back());

    return container;
  }
}
