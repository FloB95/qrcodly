CREATE TABLE `custom_domain` (
	`id` varchar(36) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`is_verified` boolean NOT NULL DEFAULT false,
	`verification_token` varchar(64) NOT NULL,
	`created_by` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `custom_domain_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_domain_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
ALTER TABLE `short_url` ADD `custom_domain_id` varchar(36);--> statement-breakpoint
CREATE INDEX `i_custom_domain_created_by_created_at` ON `custom_domain` (`created_by`,`created_at`);--> statement-breakpoint
CREATE INDEX `i_custom_domain_domain` ON `custom_domain` (`domain`);--> statement-breakpoint
ALTER TABLE `short_url` ADD CONSTRAINT `short_url_custom_domain_id_custom_domain_id_fk` FOREIGN KEY (`custom_domain_id`) REFERENCES `custom_domain`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `i_short_url_custom_domain_id` ON `short_url` (`custom_domain_id`);