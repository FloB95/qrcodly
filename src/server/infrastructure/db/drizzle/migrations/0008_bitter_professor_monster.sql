ALTER TABLE `qrcodly_qr_code` RENAME COLUMN `contentType` TO `content_type`;--> statement-breakpoint
ALTER TABLE `qrcodly_qr_code` RENAME COLUMN `originalData` TO `original_data`;--> statement-breakpoint
ALTER TABLE `qrcodly_qr_code` RENAME COLUMN `createdBy` TO `created_by`;--> statement-breakpoint
ALTER TABLE `qrcodly_qr_code` RENAME COLUMN `createdAt` TO `created_at`;--> statement-breakpoint
ALTER TABLE `qrcodly_qr_code` RENAME COLUMN `updatedAt` TO `updated_at`;