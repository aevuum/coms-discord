import { REST, Routes } from "discord.js";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    // 1. Очистка команд конкретного сервера (если регистрировали локально)
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: [],
      });
    }

    // 2. Очистка глобальных команд приложения
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });

    console.log("Все старые команды успешно удалены из API Discord.");
  } catch (error) {
    console.error(error);
  }
})();
