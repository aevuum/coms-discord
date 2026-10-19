import { TERMS_VERSION } from "../lib/termsConfig.js";
import { TermsRepository } from "../repositories/termsRepository.js";

export class TermsService {
  private static accepted = new Set<string>();

  public static async hasAccepted(discordId: string) {
    if (this.accepted.has(discordId)) {
      return true;
    }

    const record = await TermsRepository.find(discordId);

    if (record?.version === TERMS_VERSION) {
      this.accepted.add(discordId);

      return true;
    }

    return false;
  }

  public static async accept(discordId: string) {
    await TermsRepository.accept(discordId, TERMS_VERSION);

    this.accepted.add(discordId);
  }

  public static async withdraw(discordId: string) {
    await TermsRepository.withdraw(discordId);

    this.accepted.delete(discordId);
  }

  public static async acceptedAt(discordId: string) {
    const record = await TermsRepository.find(discordId);

    return record?.version === TERMS_VERSION ? record.acceptedAt : null;
  }
}
