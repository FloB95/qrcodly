import { relations } from 'drizzle-orm';
import { boolean, datetime, index, mysqlEnum, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';
import shortUrl from './short-url';

/** Where the malicious verdict came from. */
export const URL_SAFETY_INCIDENT_SOURCES = ['create', 'update', 'duplicate', 'recheck'] as const;
export type TUrlSafetyIncidentSource = (typeof URL_SAFETY_INCIDENT_SOURCES)[number];

/**
 * What we did about it.
 * - rejected: the write never happened (create/update refused at the API boundary)
 * - blocked: an existing short URL was disabled and locked
 * - shadow: detected while the re-check job runs in shadow mode — recorded, not enforced
 * - cleared: Google delisted the destination, the block was lifted
 */
export const URL_SAFETY_INCIDENT_ACTIONS = ['rejected', 'blocked', 'shadow', 'cleared'] as const;
export type TUrlSafetyIncidentAction = (typeof URL_SAFETY_INCIDENT_ACTIONS)[number];

/**
 * Audit trail of malicious-destination findings. Serves three purposes at once: the queryable
 * history behind the safety metrics, the source of the in-app banner, and the durable record the
 * escalation ladder reasons over.
 *
 * Privacy: `destinationHost` is the hostname only. Paths and query strings can carry secrets or
 * personal data, so a full destination URL is never persisted here — mirroring the rule the
 * previous Redis-based tracker already enforced via its redactUrl().
 */
const urlSafetyIncident = createTable(
	'url_safety_incident',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar({ length: 255 }).notNull(),
		/** Null when a create was refused outright — no row was ever written. */
		shortUrlId: varchar({ length: 36 }).references(() => shortUrl.id, { onDelete: 'set null' }),
		destinationHost: varchar({ length: 255 }).notNull(),
		threatTypes: varchar({ length: 255 }),
		source: mysqlEnum('source', URL_SAFETY_INCIDENT_SOURCES).notNull(),
		action: mysqlEnum('action', URL_SAFETY_INCIDENT_ACTIONS).notNull(),
		/** False for findings that must not move the warn→ban ladder (e.g. shadow mode). */
		countedAsOffence: boolean().notNull().default(true),
		/** Set when the user dismissed the in-app banner for this incident. */
		acknowledgedAt: datetime(),
		/** Set when the block was lifted (self-healed or manually cleared). */
		resolvedAt: datetime(),
		createdAt: datetime().notNull(),
	},
	(t) => [
		index('i_url_safety_incident_user_created').on(t.userId, t.createdAt),
		index('i_url_safety_incident_short_url').on(t.shortUrlId),
		// Open-incident lookup for the dashboard banner
		index('i_url_safety_incident_open').on(t.userId, t.acknowledgedAt),
	],
);

export type TUrlSafetyIncident = typeof urlSafetyIncident.$inferSelect;
export default urlSafetyIncident;

export const urlSafetyIncidentRelations = relations(urlSafetyIncident, ({ one }) => ({
	shortUrl: one(shortUrl, {
		fields: [urlSafetyIncident.shortUrlId],
		references: [shortUrl.id],
	}),
}));
