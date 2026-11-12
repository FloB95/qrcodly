import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { NewsletterController } from './http/controller/newsletter.controller';

// Register event handlers
import './event/handler';

// Register cron jobs
import './jobs/newsletter-sync.cron-job';

const setupNewsletterModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, NewsletterController, '/newsletter', options);
	container.resolve(Logger).info('☑️  Newsletter module loaded');
	done();
};

export default setupNewsletterModule;
