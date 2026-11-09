import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { HostedPageController } from './http/controller/hosted-page.controller';
import { HostedPageUsageController } from './http/controller/hosted-page-usage.controller';

// Register Cron Jobs
import './jobs/purge-deleted-hosted-pages.cron-job';
// Register Event Handlers
import './event/handler';

/**
 * Pages and files QRcodly hosts for a QR code. The QR code module owns the code itself and calls
 * HostedPageService on create, update, duplicate and delete; everything else lives here.
 */
const setupHostedPageModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, HostedPageController, `/hosted-page`, options);
	registerRoutes(fastify, HostedPageUsageController, `/hosted-page`, options);
	container.resolve(Logger).info('☑️  Hosted page module loaded');
	done();
};

export default setupHostedPageModule;
