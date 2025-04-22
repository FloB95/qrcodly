import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';

// modules
import qrCode from './qr-code/setup';
import configTemplate from './config-template/setup';

const modules: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	qrCode(fastify, options, done);
	configTemplate(fastify, options, done);
	done();
};

export default modules;
