CREATE TABLE `qr_code_tag` (
	`qr_code_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	CONSTRAINT `qr_code_tag_qr_code_id_tag_id_pk` PRIMARY KEY(`qr_code_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(7) NOT NULL,
	`created_by` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `tag_id` PRIMARY KEY(`id`),
	CONSTRAINT `i_tag_created_by_name` UNIQUE(`created_by`,`name`)
);
--> statement-breakpoint
ALTER TABLE `qr_code_tag` ADD CONSTRAINT `qr_code_tag_qr_code_id_qr_code_id_fk` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_code`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qr_code_tag` ADD CONSTRAINT `qr_code_tag_tag_id_tag_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `i_qr_code_tag_tag_id` ON `qr_code_tag` (`tag_id`);--> statement-breakpoint
CREATE INDEX `i_tag_created_by_created_at` ON `tag` (`created_by`,`created_at`);