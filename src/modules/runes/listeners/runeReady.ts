import { Listener } from "@sapphire/framework";

import { FormulaService } from "../service/formulaService.js";
import { RuneRegistry } from "../service/runeRegistry.js";

export class RuneReadyListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "clientReady",
      once: true,
    });
  }

  public override async run() {
    try {
      const count = await RuneRegistry.load();

      this.container.logger.info(`Loaded ${count} runes`);

      const synced = await FormulaService.syncAll();

      if (synced) {
        this.container.logger.info(`Synced ${synced} rune formulas with the spell list`);
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
