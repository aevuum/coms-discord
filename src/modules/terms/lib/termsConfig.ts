export const TERMS_VERSION = "2026-10-19";

const DOCS_URL = "https://github.com/aevuum/coms-discord/blob/main/docs";

export const TERMS_LINKS = {
  terms: `${DOCS_URL}/terms-of-service.md`,
  privacy: `${DOCS_URL}/privacy-policy.md`,
  consent: `${DOCS_URL}/personal-data-consent.md`,
};

export const TERMS_CONTACT_EMAIL = "aevuum@yandex.ru";

export enum TermsAction {
  Accept = "accept",
  Decline = "decline",
  Withdraw = "withdraw",
  WithdrawConfirm = "withdraw_confirm",
  WithdrawCancel = "withdraw_cancel",
}

const PREFIX = "terms";

export class TermsCustomIds {
  public static build(action: TermsAction) {
    return `${PREFIX}:${action}`;
  }

  public static parse(customId: string) {
    const [prefix, action] = customId.split(":");

    if (prefix !== PREFIX || !Object.values(TermsAction).includes(action as TermsAction)) {
      return null;
    }

    return action as TermsAction;
  }
}
