DROP INDEX `i_user_addon_subscription_pending_effective_at` ON `user_addon_subscription`;--> statement-breakpoint
ALTER TABLE `user_addon_subscription` DROP COLUMN `pending_quantity`;--> statement-breakpoint
ALTER TABLE `user_addon_subscription` DROP COLUMN `pending_quantity_effective_at`;