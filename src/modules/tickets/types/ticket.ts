export class TicketError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TicketError";
  }
}

export type TicketSubject = {
  tagId: string;
  name: string;
  emoji: { id: string; name: string } | { unicode: string } | null;
};
