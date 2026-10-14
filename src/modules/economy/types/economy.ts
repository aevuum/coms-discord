import type {
  Character,
  CharacterTransaction,
} from "../../../database/generated/prisma/client.js";

export class EconomyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "EconomyError";
  }
}

export type CharacterOption = {
  id: string;
  rpName: string;
};

export type CharacterCard = {
  character: Character;
  hasMultiple: boolean;
};

export type TransferParams = {
  senderId: string;
  receiverId: string;
  amountKnuts: number;
  senderReason: string;
  receiverReason: string;
};

export type TransferPreview = {
  sender: Character;
  receiver: Character;
  amountKnuts: number;
};

export type TransferResult = {
  sender: Character;
  receiver: Character;
  amountKnuts: number;
};

export type TransferReceivers = {
  sender: Character;
  receiverDiscordId: string;
  characters: CharacterOption[];
};

export type HistoryPage = {
  character: Character;
  transactions: CharacterTransaction[];
  page: number;
  totalPages: number;
};
