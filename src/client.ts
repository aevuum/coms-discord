import { SapphireClient, ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);
ApplicationCommandRegistries.setDefaultGuildIds([process.env.GUILD_ID || ""]);

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  loadMessageCommandListeners: true,
  baseUserDirectory: __dirname,
});

client.login(process.env.DISCORD_TOKEN);