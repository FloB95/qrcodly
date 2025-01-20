CREATE TABLE `qrcodly_qr_code_config_template` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`config` json NOT NULL,
	`created_by` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `qrcodly_qr_code_config_template_id` PRIMARY KEY(`id`)
);
