export const SUGGESTION_PANEL_CHANNEL_ID = "1561828349612130446";

export const SUGGESTION_BOARD_CHANNEL_ID = "1561828617363656800";

export const SUGGESTION_COOLDOWN_MS = 10 * 60 * 1000;

export const SUGGESTION_CATEGORIES = [
  { value: "mechanics", label: "Новая механика", emoji: "⚙️" },
  { value: "change", label: "Изменение существующего", emoji: "🔧" },
  { value: "roleplay", label: "Ролевая игра и лор", emoji: "🪄" },
  { value: "bot", label: "Бот", emoji: "🤖" },
  { value: "server", label: "Сервер и каналы", emoji: "🏰" },
  { value: "other", label: "Другое", emoji: "💡" },
];

export enum SuggestionAction {
  Open = "open",
  Submit = "submit",
  Up = "up",
  Down = "down",
  Rate = "rate",
  Accept = "accept",
  Reject = "reject",
  RejectModal = "reject_modal",
}

export enum SuggestionFields {
  Title = "suggestion_title",
  Category = "suggestion_category",
  Description = "suggestion_description",
  Benefit = "suggestion_benefit",
  Reason = "suggestion_reason",
}

const PREFIX = "suggest";

export class SuggestionCustomIds {
  public static build(action: SuggestionAction, ...args: string[]) {
    return [PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (prefix !== PREFIX || !Object.values(SuggestionAction).includes(action as SuggestionAction)) {
      return null;
    }

    return { action: action as SuggestionAction, id: args[0] ?? null };
  }
}

export function suggestionCategory(value: string) {
  return SUGGESTION_CATEGORIES.find((category) => category.value === value) ?? SUGGESTION_CATEGORIES.at(-1)!;
}
