import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { type User } from '@clerk/fastify';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { QrCodeDefaults } from '@shared/schemas';
import { PlanName } from '@/core/config/plan.config';
import { CreateQrCodeUseCase } from '../../useCase/create-qr-code.use-case';
import QrCodeRepository from '../../domain/repository/qr-code.repository';
import { CreateConfigTemplateUseCase } from '@/modules/config-template/useCase/create-config-template.use-case';
import { createShortUrl } from '@/modules/url-shortener/http/__tests__/utils';
import { generateQrCodeDto } from './utils';

describe('bulk delete', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let user: User;
	let user2: User;

	const bulkDelete = (path: string, ids: unknown, token?: string) =>
		testServer.inject({
			method: 'POST',
			url: `${API_BASE_PATH}/${path}/bulk-delete`,
			payload: { ids },
			headers: {
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
			},
		});

	const createQrCode = (userId: string) =>
		container.resolve(CreateQrCodeUseCase).execute(generateQrCodeDto(), {
			id: userId,
			plan: PlanName.FREE,
			tokenType: 'session_token',
		});

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		user = ctx.user;
		user2 = ctx.user2;
	});

	it('deletes own QR codes and reports foreign and unknown ones without deleting them', async () => {
		const [own1, own2, foreign] = await Promise.all([
			createQrCode(user.id),
			createQrCode(user.id),
			createQrCode(user2.id),
		]);
		const unknown = randomUUID();

		const response = await bulkDelete(
			'qr-code',
			[own1.id, own2.id, foreign.id, unknown],
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ deleted: 2, failed: [foreign.id, unknown] });
		const repository = container.resolve(QrCodeRepository);
		expect(await repository.findOneById(own1.id)).toBeUndefined();
		expect(await repository.findOneById(own2.id)).toBeUndefined();
		expect(await repository.findOneById(foreign.id)).toBeDefined();
	});

	it('rejects more than 100 IDs, an empty list and unauthenticated calls', async () => {
		const tooMany = Array.from({ length: 101 }, () => randomUUID());

		expect(await bulkDelete('qr-code', tooMany, accessToken)).toHaveStatusCode(400);
		expect(await bulkDelete('qr-code', [], accessToken)).toHaveStatusCode(400);
		expect(await bulkDelete('qr-code', [randomUUID()])).toHaveStatusCode(401);
	});

	it('deletes templates', async () => {
		const template = await container
			.resolve(CreateConfigTemplateUseCase)
			.execute({ name: faker.lorem.words(2).substring(0, 50), config: QrCodeDefaults }, user.id);

		const response = await bulkDelete('config-template', [template.id], accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ deleted: 1, failed: [] });
	});

	it('deletes standalone short URLs by short code', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await bulkDelete('short-url', [shortUrl.shortCode, 'zzzzz'], accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ deleted: 1, failed: ['zzzzz'] });
	});
});
