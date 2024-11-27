ALTER TABLE `qrcodly_qr_code` ADD `content_type` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `qrcodly_qr_code` ADD `original_data` json NOT NULL;