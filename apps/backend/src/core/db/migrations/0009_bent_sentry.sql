ALTER TABLE `custom_domain` ADD `cloudflare_hostname_id` varchar(36);--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `ssl_status` varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `ownership_status` varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `ssl_validation_txt_name` varchar(255);--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `ssl_validation_txt_value` varchar(500);--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `ownership_validation_txt_name` varchar(255);--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `ownership_validation_txt_value` varchar(500);--> statement-breakpoint
ALTER TABLE `custom_domain` DROP COLUMN `is_verified`;--> statement-breakpoint
ALTER TABLE `custom_domain` DROP COLUMN `is_cname_valid`;--> statement-breakpoint
ALTER TABLE `custom_domain` DROP COLUMN `verification_token`;