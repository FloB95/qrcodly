ALTER TABLE `short_url` ADD `alias` varchar(80);--> statement-breakpoint
ALTER TABLE `short_url` ADD CONSTRAINT `u_short_url_custom_domain_alias` UNIQUE(`custom_domain_id`,`alias`);--> statement-breakpoint
CREATE INDEX `i_short_url_alias` ON `short_url` (`alias`);