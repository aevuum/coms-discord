export enum EconomyAction {
  Character = "character",
  Main = "main",
  Back = "back",
  Transfer = "transfer",
  TransferUser = "transfer_user",
  TransferCharacter = "transfer_character",
  TransferModal = "transfer_modal",
  TransferConfirm = "transfer_confirm",
  History = "history",
}

export const TransferModalFields = {
  Galleons: "galleons",
  Sickles: "sickles",
  Knuts: "knuts",
} as const;

export class EconomyCustomIds {
  private static readonly PREFIX = "economy";

  public static characterSelect() {
    return `${this.PREFIX}:${EconomyAction.Character}`;
  }

  public static main(characterId: string) {
    return `${this.PREFIX}:${EconomyAction.Main}:${characterId}`;
  }

  public static back() {
    return `${this.PREFIX}:${EconomyAction.Back}`;
  }

  public static transfer(characterId: string) {
    return `${this.PREFIX}:${EconomyAction.Transfer}:${characterId}`;
  }

  public static history(characterId: string, page = 0) {
    return `${this.PREFIX}:${EconomyAction.History}:${characterId}:${page}`;
  }

  public static transferUser(senderId: string) {
    return `${this.PREFIX}:${EconomyAction.TransferUser}:${senderId}`;
  }

  public static transferCharacter(senderId: string) {
    return `${this.PREFIX}:${EconomyAction.TransferCharacter}:${senderId}`;
  }

  public static transferModal(senderId: string, receiverId: string) {
    return `${this.PREFIX}:${EconomyAction.TransferModal}:${senderId}:${receiverId}`;
  }

  public static transferConfirm(
    senderId: string,
    receiverId: string,
    amountKnuts: number,
  ) {
    return `${this.PREFIX}:${EconomyAction.TransferConfirm}:${senderId}:${receiverId}:${amountKnuts}`;
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as EconomyAction,
      args: parts.slice(2),
    };
  }
}
