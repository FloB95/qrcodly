ALTER TABLE `account_deletion_request` ADD `confirmed_at` datetime;--> statement-breakpoint
ALTER TABLE `account_deletion_request` ADD `confirmation_token_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `account_deletion_request` ADD `confirmation_expires_at` datetime;