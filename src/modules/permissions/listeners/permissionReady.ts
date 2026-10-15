import { Listener } from "@sapphire/framework";

import { PermissionService } from "../service/permissionService.js";

export class PermissionReadyListener extends Listener {
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
      const moved = await PermissionService.migrateLegacyKeys();

      if (moved) {
        this.container.logger.info(
          `Moved ${moved} legacy command permissions to manage sections`,
        );
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
