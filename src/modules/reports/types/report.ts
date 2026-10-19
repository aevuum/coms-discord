export class ReportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ReportError";
  }
}
