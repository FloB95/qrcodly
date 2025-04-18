import { container } from 'tsyringe';

// other imports
import { type FastifyInstance, type FastifyPluginCallback } from 'fastify';
import { Logger } from '@/core/logging';
import { registerRoutes } from '@/libs/fastify/helpers';
import { QrCodeController } from './http/controller/QrCodeController';

const setupQrCodeModule: FastifyPluginCallback = (fastify: FastifyInstance, options) => {
	registerRoutes(fastify, QrCodeController, `/qr-code`, options);
	container.resolve(Logger).info('☑️  QR Code module loaded');
};

export default setupQrCodeModule;
