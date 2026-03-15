import { API_BASE_PATH } from '@/core/config/constants';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { generateShortUrlDto } from '@/tests/shared/factories/short-url.factory';

export const SHORT_URL_API_PATH = `${API_BASE_PATH}/short-url`;

export const reserveShortUrl = (testServer: FastifyInstance, token: string) =>
	testServer.inject({
		method: 'GET',
		url: `${SHORT_URL_API_PATH}/reserved`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const createShortUrl = async (
	testServer: FastifyInstance,
	token: string,
	overrides?: Parameters<typeof generateShortUrlDto>[0],
): Promise<TShortUrlWithCustomDomainResponseDto> => {
	const response = await testServer.inject({
		method: 'POST',
		url: SHORT_URL_API_PATH,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		payload: generateShortUrlDto(overrides),
	});
	expect(response).toHaveStatusCode(201);
	return JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
};
