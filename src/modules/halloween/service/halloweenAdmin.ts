import { ChannelType, type Client, type ModalSubmitInteraction } from "discord.js";

import { ChannelField } from "../../schedule/lib/channelField.js";
import { MoscowTime } from "../../schedule/lib/moscowTime.js";
import { HalloweenFields } from "../lib/halloweenContainer.js";
import { HalloweenRules } from "../lib/halloweenRules.js";
import { HalloweenRepository } from "../repositories/halloweenRepository.js";
import { HalloweenError, PUMPKIN_LIMIT } from "../types/halloween.js";
import { HalloweenService } from "./halloweenService.js";

export class HalloweenAdmin {
  public static async toggle(guildId: string) {
    const settings = await HalloweenRepository.ensureItems(guildId);

    if (settings.enabled) {
      await HalloweenRepository.save(guildId, { enabled: false, nextDropAt: null });
      return "Ивент выключен — тыквы больше не появляются.";
    }

    if (!settings.channelIds.length) {
      throw new HalloweenError("Сначала выберите каналы, где будут появляться тыквы.");
    }

    if (settings.endsAt && settings.endsAt <= new Date()) {
      throw new HalloweenError("Дата окончания ивента уже прошла — поменяйте её в настройках.");
    }

    await HalloweenRepository.save(guildId, {
      enabled: true,
      nextDropAt: HalloweenRules.nextDrop(new Date(), settings.minMinutes, settings.maxMinutes),
    });

    return "Ивент включён — первая тыква появится в ближайшее время.";
  }

  public static async saveSettings(guildId: string, field: (id: string) => string) {
    const [minMinutes, maxMinutes] = HalloweenRules.range(field(HalloweenFields.Interval), "Интервал", 5, 720);
    const lifetimeMinutes = HalloweenRules.number(field(HalloweenFields.Lifetime), "Жизнь тыквы", 1, 120);
    const [candyMin, candyMax] = HalloweenRules.range(field(HalloweenFields.Candies), "Конфеты", 1, 100);
    const rates = field(HalloweenFields.Rates).split(/[\s/,;|]+/).filter(Boolean);

    if (rates.length !== 2) {
      throw new HalloweenError("Курс: два числа через «/», например «1/25».");
    }

    const candyRate = HalloweenRules.number(rates[0], "Курс конфеты", 0, 10_000);
    const pumpkinRate = HalloweenRules.number(rates[1], "Курс тыквы", 0, 10_000);
    const endsText = field(HalloweenFields.EndsAt).trim();
    const endsAt = endsText ? MoscowTime.parse(endsText) : null;

    if (endsText && !endsAt) {
      throw new HalloweenError("Не удалось разобрать дату окончания. Пример: «01.11.2026 23:59».");
    }

    if (endsAt && endsAt <= new Date()) {
      throw new HalloweenError("Дата окончания должна быть в будущем.");
    }

    const settings = await HalloweenRepository.save(guildId, {
      minMinutes,
      maxMinutes,
      lifetimeMinutes,
      candyMin,
      candyMax,
      candyRate,
      pumpkinRate,
      endsAt,
    });

    if (settings.enabled) {
      await HalloweenRepository.save(guildId, { nextDropAt: HalloweenRules.nextDrop(new Date(), minMinutes, maxMinutes) });
    }
  }

  public static async saveChannels(interaction: ModalSubmitInteraction, guildId: string) {
    const selected = (() => {
      try {
        return interaction.fields.getSelectedChannels(HalloweenFields.Channels);
      } catch {
        return undefined;
      }
    })();

    const ids =
      selected !== undefined
        ? [...(selected?.keys() ?? [])]
        : interaction.fields
            .getTextInputValue(HalloweenFields.Channels)
            .split(/[,\n]+/)
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => ChannelField.resolve(interaction.client, guildId, part, [ChannelType.GuildText]))
            .filter((id): id is string => Boolean(id));

    const unique = [...new Set(ids)].slice(0, 15);

    await HalloweenRepository.save(guildId, { channelIds: unique });

    return unique.length;
  }

  public static async saveOffer(shopItemId: string, field: (id: string) => string) {
    const candyPrice = HalloweenRules.number(field(HalloweenFields.CandyPrice), "Цена в конфетах", 0, 100_000);
    const pumpkinPrice = HalloweenRules.number(field(HalloweenFields.PumpkinPrice), "Цена в тыквах", 0, PUMPKIN_LIMIT);

    if (!candyPrice && !pumpkinPrice) {
      throw new HalloweenError("Укажите цену хотя бы в конфетах или тыквах.");
    }

    await HalloweenRepository.saveOffer(shopItemId, candyPrice, pumpkinPrice);
  }

  public static async spawnNow(client: Client, guildId: string) {
    const settings = await HalloweenRepository.ensureItems(guildId);

    if (await HalloweenRepository.hasOpenDrop(guildId)) {
      throw new HalloweenError("Тыква уже ждёт ответа — дождитесь, пока её заберут или она укатится.");
    }

    return HalloweenService.spawn(client, settings);
  }
}
