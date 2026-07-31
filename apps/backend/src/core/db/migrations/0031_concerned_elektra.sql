CREATE TABLE `url_safety_incident` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`short_url_id` varchar(36),
	`destination_host` varchar(255) NOT NULL,
	`threat_types` varchar(255),
	`source` enum('create','update','duplicate','recheck') NOT NULL,
	`action` enum('rejected','blocked','shadow','cleared') NOT NULL,
	`counted_as_offence` boolean NOT NULL DEFAULT true,
	`acknowledged_at` datetime,
	`resolved_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `url_safety_incident_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_safety_standing` (
	`user_id` varchar(255) NOT NULL,
	`offence_count` int NOT NULL DEFAULT 0,
	`first_offence_at` datetime,
	`last_offence_at` datetime,
	`warned_at` datetime,
	`warning_email_sent_at` datetime,
	`banned_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `user_safety_standing_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `qr_code_config_template` MODIFY COLUMN `name` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `qr_code` MODIFY COLUMN `name` varchar(50);--> statement-breakpoint
ALTER TABLE `short_url` MODIFY COLUMN `name` varchar(50);--> statement-breakpoint
ALTER TABLE `short_url` ADD `safety_status` enum('unchecked','clean','blocked') DEFAULT 'unchecked' NOT NULL;--> statement-breakpoint
ALTER TABLE `short_url` ADD `safety_blocked_at` datetime;--> statement-breakpoint
ALTER TABLE `short_url` ADD `safety_threat_types` varchar(255);--> statement-breakpoint
ALTER TABLE `short_url` ADD `last_safety_check_at` datetime;--> statement-breakpoint
ALTER TABLE `short_url` ADD `next_safety_check_at` datetime;--> statement-breakpoint
ALTER TABLE `short_url` ADD `safety_check_failures` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `short_url` ADD `safety_pending_since` datetime;--> statement-breakpoint
ALTER TABLE `url_safety_incident` ADD CONSTRAINT `url_safety_incident_short_url_id_short_url_id_fk` FOREIGN KEY (`short_url_id`) REFERENCES `short_url`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `i_url_safety_incident_user_created` ON `url_safety_incident` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `i_url_safety_incident_short_url` ON `url_safety_incident` (`short_url_id`);--> statement-breakpoint
CREATE INDEX `i_url_safety_incident_open` ON `url_safety_incident` (`user_id`,`acknowledged_at`);--> statement-breakpoint
CREATE INDEX `i_user_safety_standing_last_offence` ON `user_safety_standing` (`last_offence_at`);--> statement-breakpoint
CREATE INDEX `i_short_url_next_safety_check` ON `short_url` (`next_safety_check_at`);--> statement-breakpoint
CREATE INDEX `i_short_url_created_by_safety_status` ON `short_url` (`created_by`,`safety_status`);