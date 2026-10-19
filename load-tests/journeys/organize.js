// =============================================================================
// Tags and design templates: the "organising" part of the dashboard.
// =============================================================================

import { api, body, page } from '../lib/client.js';
import { Q, fetchOne, invalidate, sidebar } from '../lib/queries.js';
import { action, CAPS, forget, itemName, mine, tagName, think } from '../lib/util.js';
import { chance, pick } from '../data/random.js';
import { tagPayload, tagUpdate, templatePayload, templateUpdate } from '../data/payloads.js';

function deleteTag(user, tag) {
	api(user, 'DELETE', `/tag/${tag.id}`, 'DELETE /tag/:id');
	forget('tags', (own) => own.id === tag.id);
	invalidate('tag:', 'qr:', 'short:');
	sidebar(user);
}

function deleteTemplate(user, template) {
	api(user, 'DELETE', `/config-template/${template.id}`, 'DELETE /config-template/:id');
	forget('templates', (own) => own.id === template.id);
	invalidate('tpl:');
	sidebar(user);
}

function tags(user) {
	action('tags', () => {
		page(user, '/dashboard/tags', '/dashboard/tags');
		fetchOne(user, Q.tags(1));
		think(4, 10);

		const roll = Math.random();
		if (roll < 0.45 || !mine.tags.length) {
			while (mine.tags.length >= CAPS.tags) deleteTag(user, mine.tags[0]);
			think(5, 12);
			const res = api(user, 'POST', '/tag', 'POST /tag', {
				body: tagPayload(tagName()),
				expect: 201,
			});
			const tag = body(res, 201);
			if (tag) mine.tags.push(tag);
			invalidate('tag:');
			sidebar(user);
		} else if (roll < 0.75) {
			const tag = pick(mine.tags);
			think(4, 10);
			api(user, 'PATCH', `/tag/${tag.id}`, 'PATCH /tag/:id', { body: tagUpdate(tagName()) });
			invalidate('tag:', 'qr:', 'short:');
			sidebar(user);
		} else {
			think(3, 6);
			deleteTag(user, mine.tags[0]);
		}
		fetchOne(user, Q.tags(1));
	});
}

function templates(user) {
	action('templates', () => {
		page(user, '/dashboard/templates', '/dashboard/templates');
		fetchOne(user, Q.templates(1));
		think(5, 12);

		const roll = Math.random();
		if (roll < 0.4 || !mine.templates.length) {
			while (mine.templates.length >= CAPS.templates) deleteTemplate(user, mine.templates[0]);
			think(15, 40);
			const res = api(user, 'POST', '/config-template', 'POST /config-template', {
				body: templatePayload(itemName()),
				expect: 201,
			});
			const template = body(res, 201);
			if (template) mine.templates.push(template);
			invalidate('tpl:');
			sidebar(user);
		} else if (roll < 0.7) {
			const template = pick(mine.templates);
			// server-rendered: the Next.js server fetches GET /config-template/:id itself
			page(user, `/dashboard/templates/${template.id}/edit`, '/dashboard/templates/:id/edit');
			think(10, 30);
			api(user, 'PATCH', `/config-template/${template.id}`, 'PATCH /config-template/:id', {
				body: templateUpdate(itemName()),
			});
			invalidate('tpl:');
		} else {
			think(3, 6);
			deleteTemplate(user, mine.templates[0]);
		}
		fetchOne(user, Q.templates(1));
	});
}

export function organize(user) {
	if (chance(0.6)) tags(user);
	else templates(user);
}
