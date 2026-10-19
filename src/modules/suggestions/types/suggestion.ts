export class SuggestionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SuggestionError";
  }
}

export type SuggestionInput = {
  title: string;
  category: string;
  description: string;
  benefit: string;
};
