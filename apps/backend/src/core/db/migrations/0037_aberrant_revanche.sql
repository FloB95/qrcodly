CREATE TABLE `hosted_page` (
	`id` varchar(36) NOT NULL,
	`created_by` varchar(255) NOT NULL,
	`type` varchar(16) NOT NULL,
	`data` json NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	`deleted_at` datetime,
	CONSTRAINT `hosted_page_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stored_file` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`owner_type` varchar(32),
	`owner_id` varchar(36),
	`kind` varchar(16) NOT NULL,
	`slot` varchar(32),
	`item_id` varchar(64),
	`file_key` varchar(255) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` int NOT NULL,
	`content_type` varchar(64) NOT NULL,
	`claimed_at` datetime,
	`released_at` datetime,
	`purge_after` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `stored_file_id` PRIMARY KEY(`id`),
	CONSTRAINT `stored_file_fileKey_unique` UNIQUE(`file_key`)
);
--> statement-breakpoint
ALTER TABLE `short_url` ADD `hosted_page_id` varchar(36);--> statement-breakpoint
ALTER TABLE `short_url` ADD CONSTRAINT `short_url_hostedPageId_unique` UNIQUE(`hosted_page_id`);--> statement-breakpoint
CREATE INDEX `i_hosted_page_created_by_created_at` ON `hosted_page` (`created_by`,`created_at`);--> statement-breakpoint
CREATE INDEX `i_stored_file_user_released` ON `stored_file` (`user_id`,`released_at`);--> statement-breakpoint
CREATE INDEX `i_stored_file_owner` ON `stored_file` (`owner_type`,`owner_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `i_stored_file_claimed_created` ON `stored_file` (`claimed_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `i_stored_file_purge_after` ON `stored_file` (`purge_after`);--> statement-breakpoint
ALTER TABLE `short_url` ADD CONSTRAINT `short_url_hosted_page_id_hosted_page_id_fk` FOREIGN KEY (`hosted_page_id`) REFERENCES `hosted_page`(`id`) ON DELETE no action ON UPDATE no action;