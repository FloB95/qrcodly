import './core/setup';
import { container } from 'tsyringe';
import { Logger } from './core/logging';
import { ShutdownService } from './core/services/shutdown.service';
import { Server } from './core/server';
import { poolConnection } from './core/db';
import { sleep } from './utils/general';
import { CronJobWorker } from './core/jobs/cron-job-worker';

export class Application {
	private logger = container.resolve(Logger);
	private shutdownService = container.resolve(ShutdownService);
	public server = container.resolve(Server);

	async start() {
		try {
			await this.server.start();
			container.resolve(CronJobWorker).start();
		} catch (error) {
			await this.exitWithCrash('Failed to start application', error);
		}
	}

	getServer() {
		return this.server.server;
	}

	async shutdown(signal: string) {
		const gracefulShutdownTimeoutInS = 10;

		if (this.shutdownService.isShuttingDown()) {
			this.logger.info(`Received ${signal}. Already shutting down...`);
			return;
		}

		const forceShutdownTimer = setTimeout(async () => {
			this.logger.info(`Process exited after ${gracefulShutdownTimeoutInS}s`);
			const errorMsg = `Shutdown timed out after ${gracefulShutdownTimeoutInS} seconds`;
			await this.exitWithCrash(errorMsg, new Error(errorMsg));
		}, gracefulShutdownTimeoutInS * 1000);

		this.logger.info(`Received ${signal}. Shutting down...`);
		this.shutdownService.shutdown();

		await this.shutdownService.waitForShutdown();
		clearTimeout(forceShutdownTimer);

		this.logger.debug('Shutdown database');
		await poolConnection.end();
		this.logger.info('Shutdown complete');

		process.exit();
	}

	private async exitWithCrash(message: string, error: unknown) {
		this.logger.error(message, { error: error });
		await sleep(2000);
		process.exit(1);
	}
}
