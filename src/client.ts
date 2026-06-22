import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { registerModulePaths } from './lib/moduleLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new SapphireClient({
    intents: [GatewayIntentBits.Guilds]
});

registerModulePaths(
    client,
    join(__dirname, 'modules')
);


await client.login(process.env.DISCORD_TOKEN);