export enum TicketAction {
  Open = "open",
  Call = "call",
  Review = "review",
  Close = "close",
  CloseConfirm = "close_confirm",
  CloseCancel = "close_cancel",
}

const PREFIX = "ticket";

export class TicketCustomIds {
  public static build(action: TicketAction, ...args: string[]) {
    return [PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (
      prefix !== PREFIX ||
      !Object.values(TicketAction).includes(action as TicketAction)
    ) {
      return null;
    }

    return { action: action as TicketAction, args };
  }
}
