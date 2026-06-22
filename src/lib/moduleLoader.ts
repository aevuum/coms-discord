import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { SapphireClient } from '@sapphire/framework';

export function registerModulePaths(
    client: SapphireClient,
    modulesPath: string
) {
    const modules = readdirSync(modulesPath);

    for (const moduleName of modules) {
        const modulePath = join(modulesPath, moduleName);

        if (!statSync(modulePath).isDirectory()) {
            continue;
        }


        client.stores.registerPath(modulePath);
    }
}