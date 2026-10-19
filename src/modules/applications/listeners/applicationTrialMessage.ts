import { Listener } from "@sapphire/framework";
import { MessageFlags, type Message } from "discord.js";

import { ApplicationContainer } from "../lib/applicationContainer.js";
import { ApplicationRepository } from "../repositories/applicationRepository.js";
import { ApplicationService } from "../service/applicationService.js";
import { ApplicationError } from "../types/application.js";

export class ApplicationTrialMessageListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "messageCreate",
    });
  }

  public override async run(message: Message) {
    if (message.guild || message.author.bot || !message.content.trim()) {
      return;
    }

    try {
      const application = await ApplicationRepository.findAwaitingPost(message.author.id);

      if (!application) {
        return;
      }

      await ApplicationService.submitTrialPost(
        message.client,
        message.author.id,
        application.id,
        message.content,
      );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          ApplicationContainer.success(
            "Пробный пост получен, заявка отправлена на рассмотрение. Решение придёт вам сюда же.",
          ),
        ],
      });
    } catch (error) {
      if (!(error instanceof ApplicationError)) {
        this.container.logger.error(error);
      }

      await message
        .reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            ApplicationContainer.error(
              error instanceof ApplicationError
                ? error.message
                : "Не удалось принять пост. Попробуйте ещё раз позже.",
            ),
          ],
        })
        .catch(() => null);
    }
  }
}
