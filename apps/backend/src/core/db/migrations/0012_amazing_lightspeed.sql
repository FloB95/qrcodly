ALTER TABLE `custom_domain` ADD `verification_phase` varchar(30) DEFAULT 'dns_verification' NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `verification_token` varchar(36);--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `ownership_txt_verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `cname_verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `custom_domain` SET `verification_phase` = 'cloudflare_ssl', `ownership_txt_verified` = true, `cname_verified` = true WHERE `cloudflare_hostname_id` IS NOT NULL;