export const HALLOWEEN_MANAGE_KEY = "manage.halloween";
export const EVENT_CURRENCY_CATEGORY = "event_currency";
export const PUMPKIN_LIMIT = 3;
export const PUMPKIN = "🎃";
export const CANDY = "🍬";

export enum HalloweenChoice {
  Magic = "magic",
  Life = "life",
}

export class HalloweenError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "HalloweenError";
  }
}
