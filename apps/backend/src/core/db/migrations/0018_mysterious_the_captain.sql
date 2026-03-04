CREATE TABLE `user_subscription` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`stripe_customer_id` varchar(255) NOT NULL,
	`stripe_subscription_id` varchar(255) NOT NULL,
	`stripe_price_id` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL,
	`current_period_start` datetime NOT NULL,
	`current_period_end` datetime NOT NULL,
	`cancel_at_period_end` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `user_subscription_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_subscription_userId_unique` UNIQUE(`user_id`),
	CONSTRAINT `user_subscription_stripeSubscriptionId_unique` UNIQUE(`stripe_subscription_id`)
);
--> statement-breakpoint
CREATE INDEX `i_user_subscription_user_id` ON `user_subscription` (`user_id`);--> statement-breakpoint
CREATE INDEX `i_user_subscription_stripe_customer_id` ON `user_subscription` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `i_user_subscription_stripe_subscription_id` ON `user_subscription` (`stripe_subscription_id`);--> statement-breakpoint
CREATE INDEX `i_user_subscription_status` ON `user_subscription` (`status`);