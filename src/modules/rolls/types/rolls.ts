import { RollKind } from "../../../database/generated/prisma/client.js";

export { RollKind };

export class RollError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RollError";
  }
}

export type RollKindMeta = {
  kind: RollKind;
  slug: string;
  command: string;
  plural: string;
  single: string;
  accusative: string;
  emoji: string;
  defaultHint: string;
};

export type RollEntryInput = {
  name: string;
  emoji: string;
  description: string;
  imageUrl: string;
  chance: string | null;
};
