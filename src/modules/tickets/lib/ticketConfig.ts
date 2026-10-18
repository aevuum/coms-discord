import { fileURLToPath } from "node:url";

export const TICKET_PANEL_CHANNEL_ID = "1442969091378774016";

export const TICKET_TEMPLATES_FORUM_ID = "1442968986584350892";

export const TICKET_CATEGORY_ID = "1442968727011463218";

export const TICKET_STAFF_CHANNEL_ID = "1561306204376932473";

export const TICKET_CHARACTER_TAG_ID = "1442970564259221536";

export const TICKET_REVIEWER_ROLE_ID = "1440741543416828039";

export const TICKET_CALL_COOLDOWN_MS = 10 * 60 * 1000;

export const TICKET_DELETE_DELAY_MS = 10 * 1000;

export const TICKET_PANEL_IMAGE_NAME = "ticket-panel.gif";

export const TICKET_PANEL_IMAGE_PATH = fileURLToPath(
  new URL("../../../../assets/tickets/panel.gif", import.meta.url),
);
