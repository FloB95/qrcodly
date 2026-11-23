import { API_BASE_PATH } from '@/core/config/constants';
import type { FastifyInstance } from 'fastify';
import db from '@/core/db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import scanIpExclusion from '../../domain/entities/scan-ip-exclusion.entity';

export const SCAN_IP_EXCLUSION_API_PATH = `${API_BASE_PATH}/scan-ip-exclusion`;

export const insertScanIpExclusion = async (
	userId: string,
	ipRange: string,
	createdAt = new Date(),
): Promise<string> => {
	const id = randomUUID();
	await db
		.insert(scanIpExclusion)
		.values({ id, ipRange, label: null, createdBy: userId, createdAt, updatedAt: null })
		.execute();
	return id;
};

export const findScanIpExclusion = (id: string) =>
	db.query.scanIpExclusion.findFirst({ where: eq(scanIpExclusion.id, id) });

export const cleanupScanIpExclusions = async (...userIds: string[]) => {
	for (const userId of userIds) {
		await db.delete(scanIpExclusion).where(eq(scanIpExclusion.createdBy, userId)).execute();
	}
};

export const listScanIpExclusions = (testServer: FastifyInstance, token?: string) =>
	testServer.inject({
		method: 'GET',
		url: SCAN_IP_EXCLUSION_API_PATH,
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});

export const createScanIpExclusion = (
	testServer: FastifyInstance,
	payload: Record<string, unknown>,
	token?: string,
) =>
	testServer.inject({
		method: 'POST',
		url: SCAN_IP_EXCLUSION_API_PATH,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		payload,
	});

export const deleteScanIpExclusion = (testServer: FastifyInstance, id: string, token?: string) =>
	testServer.inject({
		method: 'DELETE',
		url: `${SCAN_IP_EXCLUSION_API_PATH}/${id}`,
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});

export const getCurrentIp = (
	testServer: FastifyInstance,
	token?: string,
	headers: Record<string, string> = {},
) =>
	testServer.inject({
		method: 'GET',
		url: `${SCAN_IP_EXCLUSION_API_PATH}/current-ip`,
		headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
	});
