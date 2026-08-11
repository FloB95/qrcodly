CREATE TABLE `user_addon_subscription` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`addon_type` enum('custom_domain') NOT NULL,
	`stripe_customer_id` varchar(255) NOT NULL,
	`stripe_subscription_id` varchar(255) NOT NULL,
	`stripe_price_id` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`pending_quantity` int,
	`pending_quantity_effective_at` datetime,
	`current_period_start` datetime NOT NULL,
	`current_period_end` datetime NOT NULL,
	`cancel_at_period_end` boolean NOT NULL DEFAULT false,
	`grace_period_ends_at` datetime,
	`addon_features_disabled_at` datetime,
	`cancellation_notified_at` datetime,
	`cancellation_reminder_sent_at` datetime,
	`past_due_notified_at` datetime,
	`last_stripe_event_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `user_addon_subscription_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_addon_subscription_stripeSubscriptionId_unique` UNIQUE(`stripe_subscription_id`),
	CONSTRAINT `u_user_addon_subscription_user_type` UNIQUE(`user_id`,`addon_type`)
);
--> statement-breakpoint
CREATE INDEX `i_user_addon_subscription_stripe_customer_id` ON `user_addon_subscription` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `i_user_addon_subscription_status` ON `user_addon_subscription` (`status`);--> statement-breakpoint
CREATE INDEX `i_user_addon_subscription_grace_period_ends_at` ON `user_addon_subscription` (`grace_period_ends_at`);--> statement-breakpoint
CREATE INDEX `i_user_addon_subscription_pending_effective_at` ON `user_addon_subscription` (`pending_quantity_effective_at`);