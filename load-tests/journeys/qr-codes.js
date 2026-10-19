// =============================================================================
// QR code journeys: browse the list, open details, create in the generator,
// edit, delete, duplicate and share — with the requests each screen fires.
// =============================================================================

import { UNIQUE_URLS } from '../config.js';
import { api, body, page } from '../lib/client.js';
import { Q, fetchAll, fetchOne, invalidate, loadViews, sidebar, tagIds } from '../lib/queries.js';
import {
	action,
	CAPS,
	codeCreated,
	forget,
	itemName,
	mayCreateCode,
	mine,
	think,
} from '../lib/util.js';
import { chance, pick, randomInt, sample } from '../data/random.js';
import { isSeedName, qrCodePayload, qrCodeUpdate } from '../data/payloads.js';

const LIST = '/dashboard/qr-codes';
const DETAIL = '/dashboard/qr-codes/:id';

function listPage(user, pageNo = 1, filter) {
	const list = fetchOne(user, Q.qrCodes(pageNo, filter));
	loadViews(user, list && list.data);
	return list;
}

function known(user) {
	const list = fetchOne(user, Q.qrCodes(1));
	return (list && list.data) || [];
}

function openDetail(user, qrCode) {
	// server-rendered: the Next.js server fetches GET /qr-code/:id itself
	page(user, `/dashboard/qr-codes/${qrCode.id}`, DETAIL);
	if (qrCode.shortUrl) fetchOne(user, Q.analytics(qrCode.shortUrl.shortCode));
	think(8, 25);

	// Only codes from this run: creating a second share for the same code is a 409.
	if (chance(0.1) && mine.qrCodes.some((own) => own.id === qrCode.id)) share(user, qrCode);
}

function share(user, qrCode) {
	const path = `/qr-code/${qrCode.id}/share`;
	const created = api(user, 'POST', path, 'POST /qr-code/:id/share', {
		body: { showName: true, showDownloadButton: chance(0.7) },
		expect: 201,
	});
	if (created.status !== 201) return;
	api(user, 'GET', path, 'GET /qr-code/:id/share');
	think(5, 15);
	api(user, 'DELETE', path, 'DELETE /qr-code/:id/share');
}

function deleteQrCode(user, qrCode) {
	api(user, 'DELETE', `/qr-code/${qrCode.id}`, 'DELETE /qr-code/:id');
	forget('qrCodes', (own) => own.id === qrCode.id);
	invalidate('qr:');
	sidebar(user);
}

function makeRoom(user) {
	while (mine.qrCodes.length >= CAPS.qrCodes) deleteQrCode(user, mine.qrCodes[0]);
}

export function browse(user) {
	action('browse qr codes', () => {
		page(user, LIST, LIST);
		let list = listPage(user, 1);
		think(5, 15);

		if (list && list.total > 0 && chance(0.35)) {
			const filter = chance(0.5)
				? { contentType: pick(['url', 'vCard', 'wifi', 'text']) }
				: { where: { name: { like: pick(['lt', 'seed', 'menu']) } } };
			list = listPage(user, 1, filter);
			think(4, 10);
		}
		if (list && list.total > 10 && chance(0.25)) {
			list = listPage(user, 2);
			think(4, 10);
		}

		const target = list && pick(list.data || []);
		if (target && chance(0.6)) openDetail(user, target);
	});
}

export function create(user) {
	action('create qr code', () => {
		page(user, '/', '/ (generator)');
		fetchAll(user, [Q.reservedShortUrl(), Q.subscription()]);
		if (chance(0.3)) fetchOne(user, Q.predefinedTemplates());
		think(20, 60); // picking a type, typing the content, styling

		makeRoom(user);
		const res = api(user, 'POST', '/qr-code', 'POST /qr-code', {
			body: qrCodePayload(itemName(), { unique: UNIQUE_URLS, allowDynamic: mayCreateCode() }),
			expect: 201,
		});
		const qrCode = body(res, 201);
		if (!qrCode) return;
		if (qrCode.shortUrl) codeCreated();
		mine.qrCodes.push(qrCode);
		invalidate('qr:');
		sidebar(user);

		const tags = tagIds(user);
		if (tags.length && chance(0.3)) {
			think(3, 8);
			api(user, 'PUT', `/tag/qr-code/${qrCode.id}`, 'PUT /tag/qr-code/:id', {
				body: { tagIds: sample(tags, randomInt(1, 2)) },
			});
			invalidate('qr:');
		}
		if (chance(0.5)) {
			think(2, 5);
			openDetail(user, qrCode);
		}
	});
}

export function edit(user) {
	const target = pick(mine.qrCodes) || pick(known(user));
	if (!target) return browse(user);

	action('edit qr code', () => {
		page(user, `/dashboard/qr-codes/${target.id}/edit`, `${DETAIL}/edit`);
		think(15, 45);
		const name = isSeedName(target.name) ? null : itemName();
		const res = api(user, 'PATCH', `/qr-code/${target.id}`, 'PATCH /qr-code/:id', {
			body: qrCodeUpdate(target, name, UNIQUE_URLS),
		});
		const updated = body(res);
		invalidate('qr:');
		if (!updated) return;
		Object.assign(target, updated);
		think(2, 5);
		openDetail(user, updated);
	});
}

/** Deletes something this VU created earlier — never the seeded baseline. */
export function remove(user) {
	const target = mine.qrCodes[0];
	if (!target) return browse(user);

	action('delete qr code', () => {
		page(user, LIST, LIST);
		listPage(user, 1);
		think(3, 8);
		deleteQrCode(user, target);
		listPage(user, 1);
	});
}

export function duplicate(user) {
	action('duplicate qr code', () => {
		makeRoom(user);
		// copying a dynamic code mints a new short code
		const candidates = known(user).filter((qrCode) => !qrCode.shortUrl || mayCreateCode());
		const source = pick(candidates);
		if (!source) return;
		const res = api(
			user,
			'POST',
			`/qr-code/${source.id}/duplicate`,
			'POST /qr-code/:id/duplicate',
			{
				expect: 201,
			},
		);
		const copy = body(res, 201);
		if (!copy) return;
		if (copy.shortUrl) codeCreated();
		mine.qrCodes.push(copy);
		invalidate('qr:');
		sidebar(user);
		listPage(user, 1);
	});
}
