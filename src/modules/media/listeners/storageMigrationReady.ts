import { Listener } from "@sapphire/framework";

import { SpellService } from "../../spells/service/spellService.js";
import { TupperService } from "../../tupper/service/tupperService.js";
import { StorageMigration } from "../service/storageMigration.js";

export class StorageMigrationReadyListener extends Listener {
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
      const moved = await StorageMigration.run();

      if (moved.avatars) {
        await TupperService.loadCache();
      }

      if (moved.spells) {
        await SpellService.loadCache();
      }

      if (moved.avatars || moved.banners || moved.items || moved.spells || moved.rolls) {
        this.container.logger.info(
          `Moved to storage: ${moved.avatars} avatars, ${moved.banners} banners, ${moved.items} item images, ${moved.spells} spell images, ${moved.rolls} race and trait images`,
        );
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
