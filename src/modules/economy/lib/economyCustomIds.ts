export enum EconomyAction {
  Character = "character",
  Transfer = "transfer",
  TransferUser = "transfer_user",
  TransferCharacter = "transfer_character",
  History = "history",
  Back = "back",
  TransferModal = "transfer_modal",
}

export class EconomyCustomIds {
  private static readonly PREFIX = "economy";

  public static characterSelect() {
    return `${this.PREFIX}:${EconomyAction.Character}`;
  }

  public static back() {
    return `${this.PREFIX}:${EconomyAction.Back}`;
  }

  public static transfer(characterId: string) {
    return `${this.PREFIX}:${EconomyAction.Transfer}:${characterId}`;
  }

  public static history(characterId: string) {
    return `${this.PREFIX}:${EconomyAction.History}:${characterId}`;
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

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as EconomyAction,
      args: parts.slice(2),
    };
  }

  public static isEconomy(customId: string) {
    return customId.startsWith(`${this.PREFIX}:`);
  }
}
