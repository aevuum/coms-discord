import { PointsRepository } from "../repositories/pointsRepository.js";
import { PointsAdminContainer } from "./pointsAdminContainer.js";

const RECENT = 10;

export class PointsAdminViews {
  public static async root(guildId: string, notice: string | null = null) {
    const [totals, recent, settings] = await Promise.all([
      PointsRepository.totals(),
      PointsRepository.recent(RECENT),
      PointsRepository.settings(guildId),
    ]);

    return PointsAdminContainer.root(totals, recent, settings, notice);
  }
}
