export class GiveawayError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GiveawayError";
  }
}

export type GiveawayInput = {
  prize: string;
  description: string;
  winners: string;
  duration: string;
};
