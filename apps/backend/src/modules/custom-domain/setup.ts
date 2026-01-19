import { container } from 'tsyringe';

// other imports
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { CustomDomainController } from './http/controller/custom-domain.controller';

const setupCustomDomainModule: FastifyPluginCallback = (
	fastify: FastifyInstance,
	options,
	done,
) => {
	registerRoutes(fastify, CustomDomainController, `/custom-domain`, options);
	container.resolve(Logger).info('☑️  Custom domain module loaded');
	done();
};

export default setupCustomDomainModule;
