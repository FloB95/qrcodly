import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { BillingController } from './http/controller/billing.controller';

// Import event handlers to register them
import './event/handler';

// Register Cron Jobs
import './jobs/process-expired-grace-periods.cron-job';
import './jobs/stripe-reconciliation.cron-job';
import './jobs/cancellation-reminder.cron-job';

const setupBillingModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, BillingController, `/billing`, options);
	container.resolve(Logger).info('☑️  Billing module loaded');
	done();
};

export default setupBillingModule;
