CREATE TABLE `scan_ip_exclusion` (
	`id` varchar(36) NOT NULL,
	`ip_range` varchar(64) NOT NULL,
	`label` varchar(100),
	`created_by` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `scan_ip_exclusion_id` PRIMARY KEY(`id`),
	CONSTRAINT `u_scan_ip_exclusion_created_by_ip_range` UNIQUE(`created_by`,`ip_range`)
);
