import { API_BASE_PATH } from '@/core/config/constants';
import type { FastifyInstance } from 'fastify';

export const SHORT_URL_API_PATH = `${API_BASE_PATH}/short-url`;

export const reserveShortUrl = (testServer: FastifyInstance, token: string) =>
	testServer.inject({
		method: 'GET',
		url: `${SHORT_URL_API_PATH}/reserved`,
		headers: { Authorization: `Bearer ${token}` },
	});
