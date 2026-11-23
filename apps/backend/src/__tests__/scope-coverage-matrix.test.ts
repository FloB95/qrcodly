import 'reflect-metadata';
import { ROUTE_METADATA_KEY, type RouteMetadata } from '@/core/decorators/route';
import { isLockedDuringAccountDeletion, resolveScopeForMethod } from '@/libs/fastify/helpers';

import { ApiKeyController } from '@/modules/api-key/http/controller/api-key.controller';
import { AnalyticsIntegrationController } from '@/modules/analytics/http/controller/analytics-integration.controller';
import { ShortUrlAnalyticsController } from '@/modules/analytics/http/controller/short-url-analytics.controller';
import { ScanIpExclusionController } from '@/modules/analytics/http/controller/scan-ip-exclusion.controller';
import { QrCodeController } from '@/modules/qr-code/http/controller/qr-code.controller';
import { QrCodeShareController } from '@/modules/qr-code/http/controller/qr-code-share.controller';
import { CustomDomainController } from '@/modules/custom-domain/http/controller/custom-domain.controller';
import { ConfigTemplateController } from '@/modules/config-template/http/controller/config-template.controller';
import { TagController } from '@/modules/tag/http/controller/tag.controller';
import { ShortUrlController } from '@/modules/url-shortener/http/controller/short-url.controller';
import { BillingController } from '@/modules/billing/http/controller/billing.controller';
import { DomainAddonController } from '@/modules/billing/http/controller/domain-addon.controller';
import { UserSurveyController } from '@/modules/user-survey/http/controller/user-survey.controller';
import { HostedPageController } from '@/modules/hosted-page/http/controller/hosted-page.controller';
import { HostedPageUsageController } from '@/modules/hosted-page/http/controller/hosted-page-usage.controller';
import { AccountDeletionRequestController } from '@/modules/account/http/controller/account-deletion-request.controller';
import { NewsletterController } from '@/modules/newsletter/http/controller/newsletter.controller';

const CONTROLLERS = [
	ApiKeyController,
	AnalyticsIntegrationController,
	ShortUrlAnalyticsController,
	ScanIpExclusionController,
	QrCodeController,
	QrCodeShareController,
	CustomDomainController,
	ConfigTemplateController,
	TagController,
	ShortUrlController,
	BillingController,
	DomainAddonController,
	UserSurveyController,
	HostedPageController,
	HostedPageUsageController,
	AccountDeletionRequestController,
	NewsletterController,
];

type RouteRow = {
	controller: string;
	method: string;
	path: string;
	scope: string | null;
	authHandlerSetting: 'default' | 'custom' | 'disabled';
	allowedTokenTypes: string[] | undefined;
	effectiveTokenTypes: string[] | null;
	overrideExplicit: boolean;
	hidden: boolean;
	lockedDuringAccountDeletion: boolean;
};

function gatherRoutes(): RouteRow[] {
	const rows: RouteRow[] = [];
	for (const Controller of CONTROLLERS) {
		const meta = Reflect.getMetadata(ROUTE_METADATA_KEY, Controller) as RouteMetadata[] | undefined;
		if (!meta) continue;
		for (const r of meta) {
			const explicit = r.options.config?.scope;
			const resolved = explicit ?? resolveScopeForMethod(r.method);
			let authSetting: RouteRow['authHandlerSetting'] = 'default';
			if (r.options.authHandler === false) authSetting = 'disabled';
			else if (typeof r.options.authHandler !== 'undefined') authSetting = 'custom';
			const explicitAllowed = r.options.config?.allowedTokenTypes;
			const hidden = r.options.schema?.hide === true;
			const effectiveAllowed =
				authSetting === 'disabled'
					? null
					: (explicitAllowed ?? (hidden ? ['session_token'] : null));
			rows.push({
				controller: Controller.name,
				method: r.method.toUpperCase(),
				path: r.path,
				scope: resolved ?? null,
				authHandlerSetting: authSetting,
				allowedTokenTypes: explicitAllowed,
				effectiveTokenTypes: effectiveAllowed,
				overrideExplicit: explicit !== undefined,
				hidden,
				lockedDuringAccountDeletion: isLockedDuringAccountDeletion(r),
			});
		}
	}
	return rows;
}

describe('scope-coverage-matrix', () => {
	const rows = gatherRoutes();

	it('discovers at least one route per controller (regression guard)', () => {
		const byController = new Map<string, number>();
		rows.forEach((r) => byController.set(r.controller, (byController.get(r.controller) ?? 0) + 1));
		for (const Controller of CONTROLLERS) {
			expect(byController.get(Controller.name) ?? 0).toBeGreaterThan(0);
		}
	});

	it('every authenticated route resolves to a non-null scope', () => {
		const violations = rows.filter((r) => r.authHandlerSetting !== 'disabled' && r.scope === null);
		expect(violations).toEqual([]);
	});

	it('every route uses a known HTTP method', () => {
		const allowed = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
		const violations = rows.filter((r) => !allowed.has(r.method));
		expect(violations).toEqual([]);
	});

	it('every resolved scope is one of read/write/update/delete (or null)', () => {
		const allowed = new Set(['read', 'write', 'update', 'delete', null]);
		const violations = rows.filter((r) => !allowed.has(r.scope));
		expect(violations).toEqual([]);
	});

	it('api-key management routes are session-only', () => {
		const apiKeyRoutes = rows.filter((r) => r.controller === 'ApiKeyController');
		const violations = apiKeyRoutes.filter(
			(r) => !r.allowedTokenTypes?.includes('session_token') || r.allowedTokenTypes.length !== 1,
		);
		expect(violations).toEqual([]);
	});

	it('account deletion is read, requested and withdrawn from a session only, never an API key', () => {
		// the confirm route is left out: it takes no session at all, only the secret from the mail
		const routes = rows.filter(
			(r) =>
				r.controller === 'AccountDeletionRequestController' && r.authHandlerSetting !== 'disabled',
		);
		expect(routes.map((r) => r.method).sort()).toEqual(['DELETE', 'GET', 'POST']);
		expect(routes.map((r) => r.effectiveTokenTypes)).toEqual([
			['session_token'],
			['session_token'],
			['session_token'],
		]);
	});

	it('every hidden route is effectively session-only (default rule)', () => {
		// hidden from the docs only, on purpose: API keys keep working as before
		const docsOnly = new Set([
			'ShortUrlController GET /safety-incidents',
			'ShortUrlController POST /safety-incidents/acknowledge',
			'HostedPageController POST /upload',
			'HostedPageController GET /assets',
			'HostedPageUsageController GET /usage',
		]);
		const violations = rows.filter(
			(r) =>
				r.hidden &&
				!docsOnly.has(`${r.controller} ${r.method} ${r.path}`) &&
				r.authHandlerSetting !== 'disabled' &&
				(!r.effectiveTokenTypes ||
					!r.effectiveTokenTypes.includes('session_token') ||
					r.effectiveTokenTypes.includes('api_key')),
		);
		expect(violations).toEqual([]);
	});

	it('a pending account deletion locks every creating or changing route except a known few', () => {
		const stayOpen = rows
			.filter(
				(r) =>
					(r.scope === 'write' || r.scope === 'update') &&
					r.authHandlerSetting !== 'custom' &&
					!r.lockedDuringAccountDeletion,
			)
			.map((r) => `${r.controller} ${r.method} ${r.path}`)
			.sort();

		expect(stayOpen).toEqual([
			// requesting again changes nothing
			'AccountDeletionRequestController POST ',
			// opened from the confirmation mail; must also work when it is opened twice
			'AccountDeletionRequestController POST /confirm',
			// invoices, payment details and cancelling live in the portal
			'BillingController POST /portal-session',
			// deleting stays possible
			'ConfigTemplateController POST /bulk-delete',
			// unsubscribing must always work
			'NewsletterController PUT /subscription',
			'QrCodeController POST /bulk-delete',
			'ShortUrlController POST /bulk-delete',
			// dismisses a banner, changes no content
			'ShortUrlController POST /safety-incidents/acknowledge',
			// feedback, changes no content
			'UserSurveyController POST ',
		]);
	});

	it('a pending account deletion never locks reading or deleting', () => {
		const violations = rows.filter(
			(r) => (r.scope === 'read' || r.scope === 'delete') && r.lockedDuringAccountDeletion,
		);
		expect(violations).toEqual([]);
	});

	it('snapshot of route → method → scope mapping (catches accidental drift)', () => {
		const snapshot = rows
			.map((r) => {
				const tokenTag = r.effectiveTokenTypes ? ` [${r.effectiveTokenTypes.join('|')}]` : '';
				return `${r.controller} ${r.method} ${r.path} → ${r.scope}${r.overrideExplicit ? ' (override)' : ''}${tokenTag}`;
			})
			.sort();
		expect(snapshot).toMatchSnapshot();
	});
});
