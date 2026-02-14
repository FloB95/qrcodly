import { container } from 'tsyringe';
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { TagController } from './http/controller/tag.controller';

const setupTagModule: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	registerRoutes(fastify, TagController, `/tag`, options);
	container.resolve(Logger).info('☑️  Tag module loaded');
	done();
};

export default setupTagModule;
