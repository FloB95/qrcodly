import 'reflect-metadata';
import { ROUTE_METADATA_KEY, type RouteMetadata } from '@/core/decorators/route';
import { resolveScopeForMethod } from '@/libs/fastify/helpers';

// Controllers that participate in API-key auth (not webhooks, not health)
import { ApiKeyController } from '@/modules/api-key/http/controller/api-key.controller';
import { AnalyticsIntegrationController } from '@/modules/analytics-integration/http/controller/analytics-integration.controller';
import { QrCodeController } from '@/modules/qr-code/http/controller/qr-code.controller';
import { QrCodeShareController } from '@/modules/qr-code/http/controller/qr-code-share.controller';
import { CustomDomainController } from '@/modules/custom-domain/http/controller/custom-domain.controller';
import { ConfigTemplateController } from '@/modules/config-template/http/controller/config-template.controller';
import { TagController } from '@/modules/tag/http/controller/tag.controller';
import { ShortUrlController } from '@/modules/url-shortener/http/controller/short-url.controller';
import { BillingController } from '@/modules/billing/http/controller/billing.controller';
import { UserSurveyController } from '@/modules/user-survey/http/controller/user-survey.controller';

const CONTROLLERS = [
	ApiKeyController,
	AnalyticsIntegrationController,
	QrCodeController,
	QrCodeShareController,
	CustomDomainController,
	ConfigTemplateController,
	TagController,
	ShortUrlController,
	BillingController,
	UserSurveyController,
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
			const hidden = (r.options.schema as { hide?: boolean } | undefined)?.hide === true;
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
		// Session-token-only restriction is non-negotiable here: an API key must
		// never be able to mint, list, update, or revoke other API keys.
		const violations = apiKeyRoutes.filter(
			(r) => !r.allowedTokenTypes?.includes('session_token') || r.allowedTokenTypes.length !== 1,
		);
		expect(violations).toEqual([]);
	});

	it('every hidden route is effectively session-only (default rule)', () => {
		const violations = rows.filter(
			(r) =>
				r.hidden &&
				r.authHandlerSetting !== 'disabled' &&
				(!r.effectiveTokenTypes ||
					!r.effectiveTokenTypes.includes('session_token') ||
					r.effectiveTokenTypes.includes('api_key')),
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
