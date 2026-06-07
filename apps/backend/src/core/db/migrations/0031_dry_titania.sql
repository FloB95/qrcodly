ALTER TABLE `qr_code_config_template` MODIFY COLUMN `name` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `qr_code` MODIFY COLUMN `name` varchar(50);--> statement-breakpoint
ALTER TABLE `short_url` MODIFY COLUMN `name` varchar(50);--> statement-breakpoint
ALTER TABLE `short_url` ADD `custom_slug` varchar(50);--> statement-breakpoint
ALTER TABLE `short_url` ADD `custom_slug_key` varchar(320) GENERATED ALWAYS AS (CASE
					WHEN `custom_slug` IS NULL THEN `id`
					WHEN `deleted_at` IS NOT NULL THEN CONCAT('__deleted__:', `id`)
					ELSE CONCAT(COALESCE(`custom_domain_id`, '__none__'), ':', `custom_slug`)
				END) VIRTUAL NOT NULL;--> statement-breakpoint
ALTER TABLE `short_url` ADD CONSTRAINT `unique_active_custom_slug_per_domain` UNIQUE(`custom_slug_key`);