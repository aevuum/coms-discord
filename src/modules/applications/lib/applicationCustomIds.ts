export enum ApplicationAction {
  Open = "open",
  First = "first",
  Next = "next",
  Part = "part",
  Post = "post",
  PostModal = "post_modal",
  Rate = "rate",
  Accept = "accept",
  Reject = "reject",
  RejectModal = "reject_modal",
}

const PREFIX = "staffapp";

export class ApplicationCustomIds {
  public static build(action: ApplicationAction, ...args: (string | number)[]) {
    return [PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (
      prefix !== PREFIX ||
      !Object.values(ApplicationAction).includes(action as ApplicationAction)
    ) {
      return null;
    }

    return { action: action as ApplicationAction, args };
  }

  public static question(index: number) {
    return `q${index}`;
  }
}

export enum ApplicationModalFields {
  TrialPost = "trial_post",
  RejectReason = "reject_reason",
}
