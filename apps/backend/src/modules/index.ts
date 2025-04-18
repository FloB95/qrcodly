import { FastifyInstance, FastifyPluginCallback } from 'fastify';

// modules
import qrCode from './qr-code/setup';

const modules: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
	qrCode(fastify, options, done);
	done();
};

export default modules;
