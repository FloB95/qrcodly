import { container } from 'tsyringe';

// other imports
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { ShortUrlController } from './http/controller/short-url.controller';

// Register Event Handlers
import './event/handler';

// Register Cron Jobs
import './jobs/short-url-safety-recheck.cron-job';

const setupQrCodeModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, ShortUrlController, `/short-url`, options);
	container.resolve(Logger).info('☑️  Url shortener module loaded');
	done();
};

export default setupQrCodeModule;
