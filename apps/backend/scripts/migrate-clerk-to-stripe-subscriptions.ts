/**
 * Migration script: Clerk Billing → Stripe Subscriptions
 *
 * This script migrates existing Clerk Pro subscribers to Stripe:
 * 1. Queries Clerk for users with active Pro plans
 * 2. For each user: creates a Stripe customer (with clerkUserId metadata)
 * 3. Creates a Stripe subscription for the customer
 * 4. Inserts a row into the user_subscription table
 *
 * Usage: SKIP_ENV_VALIDATION=true tsx scripts/migrate-clerk-to-stripe-subscriptions.ts
 *
 * Prerequisites:
 * - STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID_MONTHLY env vars must be set
 * - CLERK_SECRET_KEY must be set
 * - Database must be accessible
 */

import 'dotenv/config';
import 'reflect-metadata';
import Stripe from 'stripe';
import { createClerkClient } from '@clerk/backend';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { mysqlTable, varchar, datetime, boolean, index } from 'drizzle-orm/mysql-core';

// Inline table definition to avoid import issues in standalone script
const userSubscription = mysqlTable(
	'user_subscription',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar('user_id', { length: 255 }).notNull().unique(),
		stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
		stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).notNull().unique(),
		stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
		status: varchar('status', { length: 50 }).notNull(),
		currentPeriodStart: datetime('current_period_start').notNull(),
		currentPeriodEnd: datetime('current_period_end').notNull(),
		cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
		createdAt: datetime('created_at').notNull(),
		updatedAt: datetime('updated_at').notNull(),
	},
	(t) => [
		index('i_user_subscription_user_id').on(t.userId),
		index('i_user_subscription_stripe_customer_id').on(t.stripeCustomerId),
		index('i_user_subscription_stripe_subscription_id').on(t.stripeSubscriptionId),
		index('i_user_subscription_status').on(t.status),
	],
);

async function main() {
	const stripeKey = process.env.STRIPE_SECRET_KEY;
	const clerkKey = process.env.CLERK_SECRET_KEY;
	const priceId = process.env.STRIPE_PRO_PRICE_ID_MONTHLY;

	if (!stripeKey || !clerkKey || !priceId) {
		console.error(
			'Missing required env vars: STRIPE_SECRET_KEY, CLERK_SECRET_KEY, STRIPE_PRO_PRICE_ID_MONTHLY',
		);
		process.exit(1);
	}

	const stripe = new Stripe(stripeKey);
	const clerk = createClerkClient({ secretKey: clerkKey });

	const connection = await mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		port: Number(process.env.DB_PORT || 3306),
	});

	const db = drizzle(connection);

	console.log('Starting Clerk → Stripe migration...');

	// Fetch all Clerk users (paginate)
	let offset = 0;
	const limit = 100;
	let migratedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	while (true) {
		const users = await clerk.users.getUserList({ limit, offset });

		if (users.data.length === 0) break;

		for (const user of users.data) {
			const email = user.emailAddresses[0]?.emailAddress;
			if (!email) {
				console.log(`  SKIP: User ${user.id} has no email`);
				skippedCount++;
				continue;
			}

			// Check if user has a Pro plan in Clerk
			// Note: This checks Clerk's publicMetadata or org membership
			// Adjust this check based on how Clerk billing marks Pro users
			const hasPro = user.publicMetadata?.plan === 'pro';

			if (!hasPro) {
				skippedCount++;
				continue;
			}

			try {
				console.log(`  Migrating user ${user.id} (${email})...`);

				// Create or find Stripe customer
				const existingCustomers = await stripe.customers.search({
					query: `metadata["clerkUserId"]:"${user.id}"`,
				});

				let customer: Stripe.Customer;
				if (existingCustomers.data.length > 0) {
					customer = existingCustomers.data[0]!;
					console.log(`    Found existing Stripe customer: ${customer.id}`);
				} else {
					customer = await stripe.customers.create({
						email,
						name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
						metadata: { clerkUserId: user.id },
					});
					console.log(`    Created Stripe customer: ${customer.id}`);
				}

				// Create Stripe subscription
				const subscription = await stripe.subscriptions.create({
					customer: customer.id,
					items: [{ price: priceId }],
					metadata: { clerkUserId: user.id },
				});
				console.log(`    Created Stripe subscription: ${subscription.id}`);

				// Insert into DB
				const now = new Date();
				await db.insert(userSubscription).values({
					id: uuidv4(),
					userId: user.id,
					stripeCustomerId: customer.id,
					stripeSubscriptionId: subscription.id,
					stripePriceId: priceId,
					status: subscription.status,
					currentPeriodStart: new Date(subscription.current_period_start * 1000),
					currentPeriodEnd: new Date(subscription.current_period_end * 1000),
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					createdAt: now,
					updatedAt: now,
				});
				console.log(`    Inserted user_subscription row`);

				migratedCount++;
			} catch (error) {
				console.error(`    ERROR migrating user ${user.id}:`, error);
				errorCount++;
			}
		}

		if (users.data.length < limit) break;
		offset += limit;
	}

	console.log(`\nMigration complete:`);
	console.log(`  Migrated: ${migratedCount}`);
	console.log(`  Skipped: ${skippedCount}`);
	console.log(`  Errors: ${errorCount}`);

	await connection.end();
	process.exit(0);
}

main().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
