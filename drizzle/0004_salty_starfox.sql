ALTER TABLE `luukahead_user` ADD `microsoft_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `luukahead_user_microsoft_id_unique` ON `luukahead_user` (`microsoft_id`);