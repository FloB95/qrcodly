CREATE TABLE `qr_code_config_template` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`config` json NOT NULL,
	`preview_image` text,
	`is_predefined` boolean NOT NULL DEFAULT false,
	`created_by` varchar(255),
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `qr_code_config_template_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qr_code` (
	`id` varchar(36) NOT NULL,
	`config` json NOT NULL,
	`content_type` varchar(255) NOT NULL,
	`content` json NOT NULL,
	`preview_image` text,
	`created_by` varchar(255),
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `qr_code_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `short_url` (
	`id` varchar(36) NOT NULL,
	`short_code` varchar(5) NOT NULL,
	`destination_url` text,
	`created_by` varchar(255),
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `short_url_id` PRIMARY KEY(`id`),
	CONSTRAINT `short_url_shortCode_unique` UNIQUE(`short_code`)
);
--> statement-breakpoint
CREATE INDEX `i_config_template_created_by` ON `qr_code_config_template` (`created_by`);--> statement-breakpoint
CREATE INDEX `i_qr_code_created_by` ON `qr_code` (`created_by`);--> statement-breakpoint
CREATE INDEX `i_short_url_created_by` ON `short_url` (`created_by`);