CREATE TABLE `short_url_tag` (
	`short_url_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	CONSTRAINT `short_url_tag_short_url_id_tag_id_pk` PRIMARY KEY(`short_url_id`,`tag_id`)
);
--> statement-breakpoint
ALTER TABLE `short_url` ADD `name` varchar(255);--> statement-breakpoint
ALTER TABLE `short_url_tag` ADD CONSTRAINT `short_url_tag_short_url_id_short_url_id_fk` FOREIGN KEY (`short_url_id`) REFERENCES `short_url`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `short_url_tag` ADD CONSTRAINT `short_url_tag_tag_id_tag_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `i_short_url_tag_tag_id` ON `short_url_tag` (`tag_id`);