ALTER TABLE `short_url` ADD `qr_code_id` varchar(36);--> statement-breakpoint
ALTER TABLE `short_url` ADD CONSTRAINT `short_url_qrCodeId_unique` UNIQUE(`qr_code_id`);--> statement-breakpoint
ALTER TABLE `short_url` ADD CONSTRAINT `short_url_qr_code_id_qr_code_id_fk` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_code`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `i_short_url_qr_code_id` ON `short_url` (`qr_code_id`);