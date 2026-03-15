CREATE TABLE `user_survey` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`rating` enum('up','down') NOT NULL,
	`feedback` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `user_survey_id` PRIMARY KEY(`id`),
	CONSTRAINT `i_user_survey_user_id` UNIQUE(`user_id`)
);
