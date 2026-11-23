import { getTableName, is } from 'drizzle-orm';
import { MySqlTable } from 'drizzle-orm/mysql-core';
import * as schema from '@qrcodly/db';

/**
 * What happens to each table when a user is deleted in Clerk (`UserDeletedEvent`). A new table
 * fails this test until it is added here: either a module removes its rows in its
 * `event/handler/user-deleted.event-handler.ts`, reusing the module's delete use case, or the
 * rows are kept on purpose, with the reason.
 *
 * Outside the database the same event revokes the user's API keys in Clerk (api-key module) and
 * removes them from the newsletter (newsletter module).
 */
const ON_USER_DELETION: Record<string, { removedBy: string } | { kept: string }> = {
	qr_code: { removedBy: 'qr-code: DeleteQrCodeUseCase for each QR code' },
	qr_code_share: { removedBy: 'cascades with its QR code' },
	qr_code_tag: { removedBy: 'cascades with its QR code and tag' },
	hosted_page: {
		removedBy:
			'deleted with its QR code (DeleteQrCodeUseCase), purged after the retention period by PurgeDeletedHostedPagesCronJob',
	},
	stored_file: {
		removedBy: 'released with its hosted page, purged by CleanupStoredFilesCronJob',
	},
	short_url: {
		kept: 'soft-deleted only (QR codes take theirs, the url-shortener handler the standalone ones via DeleteShortUrlUseCase), so the code is never handed out again',
	},
	short_url_tag: { removedBy: 'cascades with its tag' },
	url_safety_incident: { removedBy: 'url-shortener handler' },
	user_safety_standing: { removedBy: 'url-shortener handler' },
	qr_code_config_template: { removedBy: 'config-template: DeleteConfigTemplateUseCase' },
	tag: { removedBy: 'tag: DeleteTagUseCase' },
	custom_domain: {
		removedBy: 'custom-domain: DeleteCustomDomainUseCase, including the Cloudflare hostname',
	},
	user_subscription: {
		removedBy: 'billing: EndBillingOfDeletedUserUseCase, after canceling in Stripe',
	},
	user_addon_subscription: {
		removedBy: 'billing: EndBillingOfDeletedUserUseCase, after canceling in Stripe',
	},
	analytics_integration: { removedBy: 'analytics handler' },
	scan_ip_exclusion: { removedBy: 'analytics handler' },
	user_survey: { removedBy: 'user-survey handler' },
	integration_usage: { removedBy: 'integration-usage handler' },
	account_deletion_request: {
		removedBy: 'account: FinishAccountDeletionUseCase, after the goodbye mail',
	},
};

describe('user data on user deletion', () => {
	const tables = (Object.values(schema) as unknown[])
		.filter((value): value is MySqlTable => is(value, MySqlTable))
		.map((table) => getTableName(table))
		.sort();

	it('decides for every table what happens to its rows when a user is deleted', () => {
		const undecided = tables.filter((name) => !(name in ON_USER_DELETION));
		expect(undecided).toEqual([]);
	});

	it('lists no table that does not exist any more', () => {
		const unknown = Object.keys(ON_USER_DELETION).filter((name) => !tables.includes(name));
		expect(unknown).toEqual([]);
	});
});
