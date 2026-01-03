DROP INDEX `i_config_template_created_by` ON `qr_code_config_template`;--> statement-breakpoint
DROP INDEX `i_qr_code_created_by` ON `qr_code`;--> statement-breakpoint
DROP INDEX `i_short_url_created_by` ON `short_url`;--> statement-breakpoint
CREATE INDEX `i_config_template_created_by_created_at` ON `qr_code_config_template` (`created_by`,`created_at`);--> statement-breakpoint
CREATE INDEX `i_qr_code_created_by_created_at` ON `qr_code` (`created_by`,`created_at`);--> statement-breakpoint
CREATE INDEX `i_short_url_created_by_created_at` ON `short_url` (`created_by`,`created_at`);--> statement-breakpoint
CREATE INDEX `i_short_url_reserved` ON `short_url` (`created_by`,`qr_code_id`);