CREATE TABLE `integration_usage` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`client` varchar(32) NOT NULL,
	`last_version` varchar(32),
	`first_seen_at` datetime NOT NULL,
	`last_seen_at` datetime NOT NULL,
	CONSTRAINT `integration_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `u_integration_usage_user_client` UNIQUE(`user_id`,`client`)
);
--> statement-breakpoint
CREATE INDEX `i_integration_usage_client` ON `integration_usage` (`client`);