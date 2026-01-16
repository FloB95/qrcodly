import { container } from 'tsyringe';

// other imports
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';

// Register Event Handlers
import './event/handler';
import { ConfigTemplateController } from './http/controller/config-template.controller';

const setupConfigTemplateModule: FastifyPluginCallback = (
	fastify: FastifyInstance,
	options,
	done,
) => {
	registerRoutes(fastify, ConfigTemplateController, `/config-template`, options);
	container.resolve(Logger).info('☑️  Config Template module loaded');
	done();
};

export default setupConfigTemplateModule;
