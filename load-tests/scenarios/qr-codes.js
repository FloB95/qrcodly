// =============================================================================
// QR Code CRUD scenario
// Simulates: list → create → assign tags → create share link → get → update → delete
// =============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../config.js';
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../helpers.js';
import { getValidToken } from '../auth.js';
import { randomQrCodePayload, createTagPayload } from '../data/payloads.js';

export function qrCodeCrudFlow() {
	const token = getValidToken();
	if (!token) return;

	// 1. List QR codes
	const listRes = apiGet(`${BASE_URL}/qr-code?page=1&limit=10`, token, { type: 'api_list' });
	check(listRes, {
		'QR list: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 2. Create a QR code
	const payload = randomQrCodePayload();
	const createRes = apiPost(`${BASE_URL}/qr-code`, payload, token, { type: 'api_create' });
	const created = check(createRes, {
		'QR create: status 201': (r) => r.status === 201,
	});

	if (!created || createRes.status !== 201) {
		sleep(2);
		return;
	}

	let qrCode;
	try {
		qrCode = JSON.parse(createRes.body);
	} catch {
		sleep(2);
		return;
	}

	sleep(1);

	// 3. Create a tag and assign it to the QR code
	const tagRes = apiPost(`${BASE_URL}/tag`, createTagPayload(), token, { type: 'api_create' });
	let tagId = null;
	if (tagRes.status === 200 || tagRes.status === 201) {
		try {
			const tag = JSON.parse(tagRes.body);
			tagId = tag.id;

			// Assign tag to QR code
			const assignRes = apiPut(`${BASE_URL}/tag/qr-code/${qrCode.id}`, { tagIds: [tagId] }, token, {
				type: 'api_update',
			});
			check(assignRes, {
				'QR assign tags: status 200': (r) => r.status === 200,
			});
		} catch {
			// ignore
		}
	}
	sleep(1);

	// 4. Create a share link for the QR code
	const shareRes = apiPost(
		`${BASE_URL}/qr-code/${qrCode.id}/share`,
		{ showName: true, showDownloadButton: true },
		token,
		{ type: 'api_create' },
	);
	check(shareRes, {
		'QR share create: status 201': (r) => r.status === 201,
	});

	// View the share link
	if (shareRes.status === 201) {
		const getShareRes = apiGet(`${BASE_URL}/qr-code/${qrCode.id}/share`, token, {
			type: 'api_get',
		});
		check(getShareRes, {
			'QR share get: status 200': (r) => r.status === 200,
		});
	}
	sleep(1);

	// 5. Get QR code by ID
	const getRes = apiGet(`${BASE_URL}/qr-code/${qrCode.id}`, token, { type: 'api_get' });
	check(getRes, {
		'QR get: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 6. Update QR code
	const updateRes = apiPatch(`${BASE_URL}/qr-code/${qrCode.id}`, { name: 'k6-updated' }, token, {
		type: 'api_update',
	});
	check(updateRes, {
		'QR update: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 7. Delete QR code (cleanup — also deletes share link)
	const deleteRes = apiDelete(`${BASE_URL}/qr-code/${qrCode.id}`, token, {
		type: 'api_delete',
	});
	check(deleteRes, {
		'QR delete: status 200': (r) => r.status === 200 || r.status === 204,
	});

	// 8. Clean up the tag
	if (tagId) {
		apiDelete(`${BASE_URL}/tag/${tagId}`, token, { type: 'api_delete' });
	}

	sleep(2);
}

/**
 * Read-heavy flow: mostly listing and viewing QR codes
 */
export function qrCodeReadFlow() {
	const token = getValidToken();
	if (!token) return;

	// List with different pages
	for (let page = 1; page <= 3; page++) {
		const res = apiGet(`${BASE_URL}/qr-code?page=${page}&limit=10`, token, {
			type: 'api_list',
		});
		check(res, {
			'QR list page: status 200': (r) => r.status === 200,
		});
		sleep(0.5);
	}

	// List with content type filter
	const filteredRes = apiGet(`${BASE_URL}/qr-code?page=1&limit=10&contentType=url`, token, {
		type: 'api_list',
	});
	check(filteredRes, {
		'QR list filtered: status 200': (r) => r.status === 200,
	});

	sleep(2);
}
