CREATE TABLE `qr_code_share` (
	`id` varchar(36) NOT NULL,
	`qr_code_id` varchar(36) NOT NULL,
	`share_token` varchar(36) NOT NULL,
	`config` json NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `qr_code_share_id` PRIMARY KEY(`id`),
	CONSTRAINT `qr_code_share_qr_code_id_unique` UNIQUE(`qr_code_id`),
	CONSTRAINT `qr_code_share_share_token_unique` UNIQUE(`share_token`)
);
--> statement-breakpoint
ALTER TABLE `qr_code_share` ADD CONSTRAINT `qr_code_share_qr_code_id_qr_code_id_fk` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_code`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `i_qr_code_share_qr_code_id` ON `qr_code_share` (`qr_code_id`);--> statement-breakpoint
CREATE INDEX `i_qr_code_share_token` ON `qr_code_share` (`share_token`);--> statement-breakpoint
CREATE INDEX `i_qr_code_share_created_by` ON `qr_code_share` (`created_by`);