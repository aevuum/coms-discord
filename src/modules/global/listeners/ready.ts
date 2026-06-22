import { Listener } from '@sapphire/framework';

export class ReadyEvent extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'clientReady',
      once: true
    });
  }

  public run() {
    this.container.logger.info(`Bot logged in as ${this.container.client.user?.tag}`);

    this.container.client.user?.setPresence({
      status: 'idle'
    });
  }
}