CREATE TABLE `account_deletion_request` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`requested_at` datetime NOT NULL,
	`revoked_at` datetime,
	CONSTRAINT `account_deletion_request_id` PRIMARY KEY(`id`),
	CONSTRAINT `i_account_deletion_request_user_id` UNIQUE(`user_id`)
);
