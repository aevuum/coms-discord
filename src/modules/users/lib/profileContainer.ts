import {
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type User,
} from "discord.js";
import { ProfileService } from "../service/profileService.js";
import { VoiceTracker } from "./voiceTracker.js";
import type { Profile } from "../types/profile.js";
import { ProfileComponents } from "./profileComponents.js";
import { CoinFormatter } from "../../coins/lib/coinFormatter.js";
import { ShopFormatter } from "../../shop/lib/shopFormatter.js";
import { AwardFormatter } from "../../award/lib/awardFormatter.js";

export class ProfileContainer {
  public static build(
    discordUser: User,
    profile: Profile | null,
    tab: string = "main",
  ): ContainerBuilder {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const avatarUrl = discordUser.displayAvatarURL({ size: 512 });

    if (profile?.profileBannerUrl) {
      const bannerGallery = new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(profile.profileBannerUrl),
      );
      container.addMediaGalleryComponents(bannerGallery);
    }

    let contentText = "";

    if (!profile) {
      contentText = "⚠️ Данные профиля не найдены.";
    } else {
      switch (tab) {
        case "economy": {
          const balance = profile.wallet?.comsCoins ?? 0;
          contentText = [
            "## <:26828shopgreen:1518587281349415084> Экономика",
            "",
            `Комс-коины: ${CoinFormatter.amount(balance)}`,
            "-# Потратить их можно в /shop.",
          ].join("\n");
          break;
        }

        case "characters": {
          contentText =
            "## <a:79289discordhalloween:1518587311741210644> Персонажи\n";
          break;
        }

        case "inventory": {
          const inventory = profile.inventory ?? [];
          contentText = [
            "## <:527877discordlegendchest:1518587359136972930> Инвентарь",
            "",
            inventory.length
              ? inventory
                  .map(
                    (entry) =>
                      `${ShopFormatter.title(entry.shopItem)} × **${entry.quantity}**`,
                  )
                  .join("\n")
              : "*Инвентарь пуст — загляните в /shop*",
          ].join("\n");
          break;
        }
        case "awards": {
          const userWithAwards = profile as any;
          const awards = userWithAwards.awards ?? [];

          contentText = [
            "## <:972712donator:1518581051960852601> Награды",
            "",
            awards.length
              ? awards
                  .map(
                    (ua: any) =>
                      `${ua.award?.emoji ?? "🏆"} **${ua.award?.label ?? "Награда"}** ${ua.award ? AwardFormatter.stars(ua.award.rarity) : ""}\n${ua.award?.description ?? ""}`,
                  )
                  .join("\n\n")
              : "*У пользователя нет наград*",
          ].join("\n");
          break;
        }

        case "main":
        default: {
          contentText = [
            "## <:928205membericon:1518581050555633674> Главная страница профиля",
            "",
            "Добро пожаловать в личный кабинет! Используйте меню ниже, чтобы переключаться между разделами.",
            "",
            "### <:67793memberhexagon:1518587303218511892> Статистика",
            `<:70956comment:1518587304808284290> Сообщений: **${profile.messagesCount.toLocaleString("ru-RU")}**`,
            `<:988044dots:1518581053642772621> В голосовых: **${ProfileService.formatVoice(profile.voiceSeconds + VoiceTracker.pending(discordUser.id))}**`,
          ].join("\n");
          break;
        }
      }
    }

    const userProfile = profile as any;
    let nicknameBlock = `**${discordUser.displayName}**`;

    if (
      userProfile?.selectedAwardId &&
      userProfile.selectedAwardId !== "none"
    ) {
      const selectedAwardObj = userProfile.awards?.find(
        (ua: any) => ua.awardId === userProfile.selectedAwardId,
      );
      if (selectedAwardObj?.award) {
        const award = selectedAwardObj.award;
        nicknameBlock = `**__${discordUser.displayName}__**\n${award.emoji} **${award.label}** ${AwardFormatter.stars(award.rarity)}`;
      }
    }

    const fullMessageText = [nicknameBlock, "", contentText].join("\n");

    const mainSection = new SectionBuilder()
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
      .addTextDisplayComponents((builder) =>
        builder.setContent(fullMessageText),
      );

    container.addSectionComponents(mainSection);

    if (tab === "characters" && profile?.characters) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      if (profile.characters.length === 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent("*Персонажи отсутствуют*"),
        );
      } else {
        const formattedCharacters = ProfileService.getFormattedCharactersList(
          profile.characters,
        );

        for (const char of formattedCharacters) {
          const text = new TextDisplayBuilder().setContent(char.text);

          if (char.avatarUrl) {
            container.addSectionComponents(
              new SectionBuilder()
                .addTextDisplayComponents(text)
                .setThumbnailAccessory(
                  new ThumbnailBuilder().setURL(char.avatarUrl),
                ),
            );
          } else {
            container.addTextDisplayComponents(text);
          }
        }

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "-# Выберите своего персонажа ниже — карточка с маной и инвентарём придёт вам в личные сообщения.",
          ),
        );

        container.addActionRowComponents(
          ProfileComponents.characterSelect(discordUser.id, profile.characters),
        );
      }

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );
    }

    if (tab === "inventory" && profile?.inventory?.length) {
      container.addActionRowComponents(
        ProfileComponents.itemSelect(discordUser.id, profile.inventory),
      );
    }

    const interactiveRows = ProfileComponents.createMenu(discordUser.id);
    container.addActionRowComponents(...(interactiveRows as any));

    return container;
  }

  public static createMessagePayload(
    discordUser: User,
    profile: Profile | null,
    tab: string = "main",
  ) {
    return {
      components: [this.build(discordUser, profile, tab)],
    };
  }
}
