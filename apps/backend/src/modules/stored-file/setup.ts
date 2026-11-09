import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { env } from '@/core/config/env';
import { MalwareScanService } from './service/malware-scan.service';

// Register Cron Jobs
import './jobs/cleanup-stored-files.cron-job';

/** Files users uploaded, with their lifecycle (claim, release, purge). No routes of its own. */
const setupStoredFileModule: FastifyPluginCallback = (
	_fastify: FastifyInstance,
	_options,
	done,
) => {
	const logger = container.resolve(Logger);
	if (env.NODE_ENV === 'production' && !container.resolve(MalwareScanService).isEnabled()) {
		logger.error('storedFile.malwareScan.disabled', {
			reason: 'CLAMAV_HOST is not set, every upload is refused',
		});
	}
	logger.info('☑️  Stored file module loaded');
	done();
};

export default setupStoredFileModule;
