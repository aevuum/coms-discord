import { ContainerBuilder, TextDisplayBuilder } from "discord.js";
import { ManageCharacterComponents } from "./manageCharacterComponents.js";

export class ManageCharacterContainer {
  public static build(
    state:
      | "main"
      | "select_user_create"
      | "select_user_delete"
      | "select_user_freeze"
      | "select_user_unfreeze"
      | "select_user_kill",
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    let content =
      "# <:563621mod8:1518587360886128661> Управление персонажами\n\nВыберите действие.";

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(content),
    );

    if (state === "main") {
      container.addActionRowComponents(
        ManageCharacterComponents.createActions(),
      );
    }

    if (state === "select_user_create") {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:67793memberhexagon:1518587303218511892> Создание персонажа\n\nВыберите участника.",
        ),
      );

      container.addActionRowComponents(
        ManageCharacterComponents.createUserSelect("create"),
      );
    }

    if (state === "select_user_delete") {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:12138cross:1518587259669053591> Удаление персонажа\n\nВыберите участника.",
        ),
      );

      container.addActionRowComponents(
        ManageCharacterComponents.createUserSelect("delete"),
      );
    }

    if (state === "select_user_freeze") {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:9472discordswordinstone:1518587257743867915> Заморозка персонажа\n\nВыберите участника.",
        ),
      );

      container.addActionRowComponents(
        ManageCharacterComponents.createUserSelect("freeze"),
      );
    }

    if (state === "select_user_unfreeze") {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:525350halloween:1518581043999936633> Разморозка персонажа\n\nВыберите участника.",
        ),
      );

      container.addActionRowComponents(
        ManageCharacterComponents.createUserSelect("unfreeze"),
      );
    }

    if (state === "select_user_kill") {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:633509a:1518587362513256458> Умерщвление персонажа\n\nВыберите участника.",
        ),
      );

      container.addActionRowComponents(
        ManageCharacterComponents.createUserSelect("kill"),
      );
    }

    return container;
  }

  public static buildCharacterSelection(
    action: "delete" | "freeze" | "unfreeze" | "kill",
    userId: string,
    characters: {
      id: string;
      rpName: string;
    }[],
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <:423717discordcamp:1518587355068497950> Выбор персонажа\n\n  <:48765whitearrow:1518587298281685173> Выберите персонажа для операции.",
      ),
    );

    container.addActionRowComponents(
      ManageCharacterComponents.createCharacterSelect(
        action,
        userId,
        characters,
      ),
    );

    container.addActionRowComponents(ManageCharacterComponents.createBack());

    return container;
  }

  public static createSuccess(text: string) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## <:312537mark:1518581040548024430> Успешно\n\n${text}`,
      ),
    );

    return container;
  }

  public static createError(text: string) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## <:240191mark:1518581039172292688> Ошибка\n\n${text}`,
      ),
    );

    return container;
  }
}
