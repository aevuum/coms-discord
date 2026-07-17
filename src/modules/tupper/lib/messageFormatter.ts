import type { Message } from "discord.js";

export class MessageFormatter {
  public static async format(
    message: Message,
    content: string,
  ): Promise<string> {
    if (!message.reference?.messageId) {
      return content;
    }

    try {
      const repliedMessage = await message.fetchReference();

      const repliedContent =
        repliedMessage.content.length > 180
          ? `${repliedMessage.content.slice(0, 180)}...`
          : repliedMessage.content;

      return [
        `> **Ответ пользователю ${repliedMessage.author.displayName}**`,
        `> ${repliedContent || "*Без текста*"}`,
        "",
        content,
      ].join("\n");
    } catch {
      return content;
    }
  }
}
