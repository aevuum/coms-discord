import {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  type User,
} from "discord.js";
import { ProfileService } from "../service/profileService.js";
import type { Profile } from "../types/profile.js";
import { ProfileComponents } from "./profileComponents.js";

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
            `Баланс: **${balance.toLocaleString()}**`,
          ].join("\n");
          break;
        }

        case "stats": {
          contentText = [
            "## <:67793memberhexagon:1518587303218511892> Статистика",
            "",
            `<:70956comment:1518587304808284290> Сообщений: **${profile.messagesCount.toLocaleString()}**`,
            `<:26487intake:1518587280028073994> В голосовых: **${ProfileService.formatVoice(profile.voiceSeconds)}**`,
          ].join("\n");
          break;
        }

        case "characters": {
          const characters = ProfileService.formatCharacters(
            profile.characters,
            "*Персонажи отсутствуют*",
          );
          contentText = [
            "## <a:79289discordhalloween:1518587311741210644> Персонажи",
            "",
            characters,
          ].join("\n");
          break;
        }

        case "inventory": {
          contentText = [
            "## <:527877discordlegendchest:1518587359136972930> Инвентарь",
            "",
            "*Функционал инвентаря находится в разработке...*",
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
                      `${ua.award?.emoji ?? "🏆"} **${ua.award?.label ?? "Награда"}**\n${ua.award?.description ?? ""}`,
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
        nicknameBlock = `**__${discordUser.displayName}__**\n${award.emoji} **${award.label} (\`${award.rarity}**\`)`;
      }
    }

    const fullMessageText = [nicknameBlock, "", contentText].join("\n");

    const mainSection = new SectionBuilder()
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
      .addTextDisplayComponents((builder) =>
        builder.setContent(fullMessageText),
      );

    container.addSectionComponents(mainSection);

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
