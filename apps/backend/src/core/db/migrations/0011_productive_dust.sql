ALTER TABLE `custom_domain` MODIFY COLUMN `ssl_status` varchar(50) NOT NULL DEFAULT 'initializing';--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `validation_errors` text;