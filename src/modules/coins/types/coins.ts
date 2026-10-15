export class CoinsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CoinsError";
  }
}

export type StipendView = {
  id: string;
  roleId: string;
  roleName: string;
  amount: number;
  lastPaidAt: Date | null;
};
