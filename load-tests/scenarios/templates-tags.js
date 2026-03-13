// =============================================================================
// Config Templates & Tags scenarios
// =============================================================================

import { check, sleep } from 'k6';
import { BASE_URL } from '../config.js';
import { apiGet, apiPost, apiPatch, apiDelete } from '../helpers.js';
import { getValidToken } from '../auth.js';
import {
	createConfigTemplatePayload,
	updateConfigTemplatePayload,
	createTagPayload,
	updateTagPayload,
} from '../data/payloads.js';

// --- Config Templates ---

export function configTemplateCrudFlow() {
	const token = getValidToken();
	if (!token) return;

	// 1. List templates
	const listRes = apiGet(`${BASE_URL}/config-template?page=1&limit=10`, token, {
		type: 'api_list',
	});
	check(listRes, {
		'Template list: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 2. List predefined templates (public)
	const predefinedRes = apiGet(`${BASE_URL}/config-template/predefined`, token, {
		type: 'api_list',
	});
	check(predefinedRes, {
		'Template predefined: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 3. Create template
	const createRes = apiPost(`${BASE_URL}/config-template`, createConfigTemplatePayload(), token, {
		type: 'api_create',
	});
	const created = check(createRes, {
		'Template create: status 200': (r) => r.status === 200 || r.status === 201,
	});

	if (!created || (createRes.status !== 200 && createRes.status !== 201)) {
		sleep(2);
		return;
	}

	let template;
	try {
		template = JSON.parse(createRes.body);
	} catch {
		sleep(2);
		return;
	}

	sleep(1);

	// 4. Get template by ID
	const getRes = apiGet(`${BASE_URL}/config-template/${template.id}`, token, {
		type: 'api_get',
	});
	check(getRes, {
		'Template get: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 5. Update template
	const updateRes = apiPatch(
		`${BASE_URL}/config-template/${template.id}`,
		updateConfigTemplatePayload(),
		token,
		{ type: 'api_update' },
	);
	check(updateRes, {
		'Template update: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 6. Delete template
	const deleteRes = apiDelete(`${BASE_URL}/config-template/${template.id}`, token, {
		type: 'api_delete',
	});
	check(deleteRes, {
		'Template delete: status 200': (r) => r.status === 200 || r.status === 204,
	});

	sleep(2);
}

// --- Tags ---

export function tagCrudFlow() {
	const token = getValidToken();
	if (!token) return;

	// 1. List tags
	const listRes = apiGet(`${BASE_URL}/tag?page=1&limit=10`, token, { type: 'api_list' });
	check(listRes, {
		'Tag list: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 2. Create tag
	const createRes = apiPost(`${BASE_URL}/tag`, createTagPayload(), token, {
		type: 'api_create',
	});
	const created = check(createRes, {
		'Tag create: status 200': (r) => r.status === 200 || r.status === 201,
	});

	if (!created || (createRes.status !== 200 && createRes.status !== 201)) {
		sleep(2);
		return;
	}

	let tag;
	try {
		tag = JSON.parse(createRes.body);
	} catch {
		sleep(2);
		return;
	}

	sleep(1);

	// 3. Update tag
	const updateRes = apiPatch(`${BASE_URL}/tag/${tag.id}`, updateTagPayload(), token, {
		type: 'api_update',
	});
	check(updateRes, {
		'Tag update: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 4. Delete tag
	const deleteRes = apiDelete(`${BASE_URL}/tag/${tag.id}`, token, { type: 'api_delete' });
	check(deleteRes, {
		'Tag delete: status 200': (r) => r.status === 200 || r.status === 204,
	});

	sleep(2);
}
