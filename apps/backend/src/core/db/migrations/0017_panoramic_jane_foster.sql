ALTER TABLE `short_url` DROP FOREIGN KEY `short_url_qr_code_id_qr_code_id_fk`;
--> statement-breakpoint
ALTER TABLE `short_url` ADD `deleted_at` datetime;--> statement-breakpoint
ALTER TABLE `short_url` ADD CONSTRAINT `short_url_qr_code_id_qr_code_id_fk` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_code`(`id`) ON DELETE set null ON UPDATE no action;