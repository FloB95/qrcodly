CREATE TABLE `analytics_integration` (
	`id` varchar(36) NOT NULL,
	`provider_type` enum('google_analytics','matomo') NOT NULL,
	`encrypted_credentials` text NOT NULL,
	`encryption_iv` varchar(32) NOT NULL,
	`encryption_tag` varchar(32) NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`ip_anonymization` boolean NOT NULL DEFAULT true,
	`last_error` text,
	`last_error_at` datetime,
	`consecutive_failures` int NOT NULL DEFAULT 0,
	`created_by` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `analytics_integration_id` PRIMARY KEY(`id`),
	CONSTRAINT `i_analytics_integration_created_by` UNIQUE(`created_by`)
);
--> statement-breakpoint
CREATE INDEX `i_analytics_integration_created_by_enabled` ON `analytics_integration` (`created_by`,`is_enabled`);