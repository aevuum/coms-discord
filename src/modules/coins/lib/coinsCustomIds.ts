export enum CoinsAdminAction {
  Root = "root",
  Add = "add",
  RolePage = "role_page",
  Role = "role",
  Stipend = "stipend",
  Edit = "edit",
  AmountModal = "amount_modal",
  Delete = "delete",
  DeleteConfirm = "delete_confirm",
  Balance = "balance",
  BalanceSearch = "balance_search",
  BalanceMember = "balance_member",
  Adjust = "adjust",
  AdjustModal = "adjust_modal",
  Activity = "activity",
  ActivityEdit = "activity_edit",
  ActivityModal = "activity_modal",
}

export const CoinsModalFields = {
  Amount: "amount",
  Reason: "reason",
  First: "reward_first",
  Second: "reward_second",
  Third: "reward_third",
} as const;

export class CoinsCustomIds {
  private static readonly PREFIX = "coinsadm";

  public static build(action: CoinsAdminAction, ...args: string[]) {
    return [this.PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as CoinsAdminAction,
      args: parts.slice(2),
    };
  }
}
