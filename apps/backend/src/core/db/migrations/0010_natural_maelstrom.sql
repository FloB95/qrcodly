CREATE TABLE `subscription_grace_period` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`first_name` varchar(255),
	`grace_period_ends_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	`processed_at` datetime,
	CONSTRAINT `subscription_grace_period_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_grace_period_userId_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `is_enabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `i_subscription_grace_period_ends_at` ON `subscription_grace_period` (`grace_period_ends_at`);--> statement-breakpoint
CREATE INDEX `i_subscription_grace_period_user_id` ON `subscription_grace_period` (`user_id`);