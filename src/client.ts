import {
  ApplicationCommandRegistries,
  RegisterBehavior,
  SapphireClient,
} from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { waitForDatabase } from "./lib/database.js";
import { hasGuildMembersIntent } from "./lib/intents.js";
import { registerModulePaths } from "./lib/moduleLoader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
  RegisterBehavior.BulkOverwrite,
);

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
];

if (await hasGuildMembersIntent(process.env.DISCORD_TOKEN)) {
  intents.push(GatewayIntentBits.GuildMembers);
} else {
  console.warn(
    "Server Members Intent is disabled in the Developer Portal: weekly role stipends will not be paid",
  );
}

const client = new SapphireClient({
  intents,
});

registerModulePaths(client, join(__dirname, "modules"));

await waitForDatabase();

await client.login(process.env.DISCORD_TOKEN);
