import { HalloweenRepository } from "../repositories/halloweenRepository.js";
import { HalloweenCard } from "./halloweenCard.js";
import { HalloweenContainer } from "./halloweenContainer.js";

export class HalloweenViews {
  public static async player(discordId: string, guildId: string, notice: string | null = null) {
    const settings = await HalloweenRepository.ensureItems(guildId);
    const [candy, pumpkin, offers] = await Promise.all([
      HalloweenRepository.quantity(discordId, settings.candyItemId),
      HalloweenRepository.quantity(discordId, settings.pumpkinItemId),
      HalloweenRepository.offers(),
    ]);

    return {
      components: [HalloweenContainer.player(settings, candy, pumpkin, offers, notice)],
      files: [HalloweenCard.attachment()],
    };
  }

  public static async admin(guildId: string, notice: string | null = null) {
    const [settings, offers] = await Promise.all([HalloweenRepository.settings(guildId), HalloweenRepository.offers()]);

    return HalloweenContainer.admin(settings, offers, notice);
  }

  public static async offers(notice: string | null = null) {
    const [offers, candidates] = await Promise.all([HalloweenRepository.offers(), HalloweenRepository.offerCandidates()]);

    return HalloweenContainer.offers(offers, candidates, notice);
  }
}
