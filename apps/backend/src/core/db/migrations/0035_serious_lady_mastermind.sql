ALTER TABLE `user_addon_subscription` ADD `stripe_schedule_id` varchar(255);--> statement-breakpoint
ALTER TABLE `user_addon_subscription` ADD `scheduled_quantity` int;--> statement-breakpoint
ALTER TABLE `user_addon_subscription` ADD `scheduled_quantity_effective_at` datetime;--> statement-breakpoint
CREATE INDEX `i_user_addon_subscription_stripe_schedule_id` ON `user_addon_subscription` (`stripe_schedule_id`);