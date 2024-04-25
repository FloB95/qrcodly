CREATE TABLE `qrcodly_post` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(256),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qrcodly_post_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qrcodly_qr_code` (
	`id` varchar(36) NOT NULL,
	`name` varchar(256),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime,
	CONSTRAINT `qrcodly_qr_code_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `name_idx` ON `qrcodly_post` (`name`);