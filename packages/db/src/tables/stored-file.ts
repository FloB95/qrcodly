import { datetime, index, int, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

export const STORED_FILE_KINDS = ['pdf', 'image'] as const;
export type TStoredFileKind = (typeof STORED_FILE_KINDS)[number];

/**
 * Where a file's object lives: `public` in the CDN bucket (re-encoded images a page shows inline),
 * `private` in a bucket without public access (files users bring as they are, streamed by the app
 * after its checks). Recorded per file, so a later change of policy never loses an object.
 */
export const STORED_FILE_VISIBILITIES = ['public', 'private'] as const;
export type TStoredFileVisibility = (typeof STORED_FILE_VISIBILITIES)[number];

/** Entities that can own stored files. QR code and template logos join later. */
export const STORED_FILE_OWNER_TYPES = ['hosted_page'] as const;
export type TStoredFileOwnerType = (typeof STORED_FILE_OWNER_TYPES)[number];

/**
 * A file a user uploaded, whatever it is used for. Uploads start unowned and are claimed by the
 * entity that references them (`ownerType` + `ownerId`, no FK because owners differ); unowned rows
 * older than a day are swept. A file its owner stops using is released, not deleted: `purgeAfter`
 * says when the sweep may remove it (null keeps it), so swaps can be undone and abuse be traced.
 */
const storedFile = createTable(
	'stored_file',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar({ length: 255 }).notNull(),
		ownerType: varchar({ length: 32 }).$type<TStoredFileOwnerType>(),
		/** Kept after release, so a released file still points to where it was used */
		ownerId: varchar({ length: 36 }),
		kind: varchar({ length: 16 }).$type<TStoredFileKind>().notNull(),
		visibility: varchar({ length: 16 }).$type<TStoredFileVisibility>().notNull(),
		/** Role at the owner, e.g. "document", "cover", "logo" */
		slot: varchar({ length: 32 }),
		/** Stable item within the slot (the document id); groups the versions of one document */
		itemId: varchar({ length: 64 }),
		fileKey: varchar({ length: 255 }).notNull().unique(),
		fileName: varchar({ length: 255 }).notNull(),
		fileSize: int().notNull(),
		contentType: varchar({ length: 64 }).notNull(),
		claimedAt: datetime(),
		releasedAt: datetime(),
		/** Earliest moment the sweep may delete a released file; null keeps it */
		purgeAfter: datetime(),
		createdAt: datetime().notNull(),
	},
	(t) => [
		// quota, pending uploads and the retention cap per user
		index('i_stored_file_user_released').on(t.userId, t.releasedAt),
		// files of an owner, and the versions of one item
		index('i_stored_file_owner').on(t.ownerType, t.ownerId, t.itemId),
		// sweep of unclaimed uploads (WHERE claimedAt IS NULL AND createdAt < ?)
		index('i_stored_file_claimed_created').on(t.claimedAt, t.createdAt),
		// sweep of released files (WHERE purgeAfter < ?)
		index('i_stored_file_purge_after').on(t.purgeAfter),
	],
);

export type TStoredFile = typeof storedFile.$inferSelect;
export default storedFile;
