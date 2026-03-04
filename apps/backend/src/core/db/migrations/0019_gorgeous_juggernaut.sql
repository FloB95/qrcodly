ALTER TABLE `user_subscription` ADD `grace_period_ends_at` datetime;--> statement-breakpoint
ALTER TABLE `user_subscription` ADD `domains_disabled_at` datetime;--> statement-breakpoint
CREATE INDEX `i_user_subscription_grace_period_ends_at` ON `user_subscription` (`grace_period_ends_at`);--> statement-breakpoint
UPDATE `user_subscription` us INNER JOIN `subscription_grace_period` gp ON us.`user_id` = gp.`user_id` SET us.`grace_period_ends_at` = gp.`grace_period_ends_at`, us.`domains_disabled_at` = gp.`processed_at`;--> statement-breakpoint
DROP TABLE `subscription_grace_period`;
