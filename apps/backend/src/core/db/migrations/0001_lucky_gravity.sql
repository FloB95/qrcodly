ALTER TABLE `short_url` MODIFY COLUMN `created_by` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `qr_code` DROP COLUMN `content_type`;