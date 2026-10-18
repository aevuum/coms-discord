import { RollService } from "../service/rollService.js";
import { RollError, RollKind } from "../types/rolls.js";
import { RollAdminContainer } from "./rollAdminContainer.js";
import { kindBySlug, ROLL_KINDS } from "./rollKinds.js";

export class RollAdminViews {
  public static async root() {
    const counts: Record<string, number> = {};

    for (const kind of Object.values(RollKind)) {
      counts[ROLL_KINDS[kind].slug] = (await RollService.list(kind)).length;
    }

    return RollAdminContainer.root(counts);
  }

  public static async list(slug: string) {
    const meta = this.meta(slug);

    return RollAdminContainer.list(meta, await RollService.list(meta.kind));
  }

  public static async view(id: string) {
    const entry = await RollService.get(id);

    return RollAdminContainer.view(ROLL_KINDS[entry.kind], entry, await RollService.list(entry.kind));
  }

  public static meta(slug: string) {
    const meta = kindBySlug(slug);

    if (!meta) {
      throw new RollError("Неизвестный раздел.");
    }

    return meta;
  }
}
