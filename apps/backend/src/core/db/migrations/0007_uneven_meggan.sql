ALTER TABLE `custom_domain` ADD `is_cname_valid` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_domain` ADD `is_default` boolean DEFAULT false NOT NULL;