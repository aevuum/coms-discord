export enum ReportAction {
  Submit = "submit",
  Take = "take",
  Resolve = "resolve",
  Reject = "reject",
}

const PREFIX = "report";

export class ReportCustomIds {
  public static build(action: ReportAction, ...args: string[]) {
    return [PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (
      prefix !== PREFIX ||
      !Object.values(ReportAction).includes(action as ReportAction)
    ) {
      return null;
    }

    return { action: action as ReportAction, args };
  }
}

export enum ReportModalFields {
  Target = "report_target",
  Reason = "report_reason",
  Description = "report_description",
  Images = "report_images",
}
