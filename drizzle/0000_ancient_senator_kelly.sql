CREATE TABLE `luukahead_item_types` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0,
	`color` text,
	FOREIGN KEY (`project_id`) REFERENCES `luukahead_project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `luukahead_priorities` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0,
	`color` text,
	FOREIGN KEY (`project_id`) REFERENCES `luukahead_project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `luukahead_project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `luukahead_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `luukahead_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `luukahead_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `luukahead_user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `luukahead_user_username_unique` ON `luukahead_user` (`username`);--> statement-breakpoint
CREATE TABLE `luukahead_work_item_visibility` (
	`work_item_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`work_item_id`, `user_id`),
	FOREIGN KEY (`work_item_id`) REFERENCES `luukahead_work_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `luukahead_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `luukahead_work_items` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`parent_id` text,
	`type_id` text,
	`priority_id` text,
	`title` text NOT NULL,
	`description` text,
	`remarks` text,
	`deadline` integer,
	`owner_id` text,
	`is_root` integer DEFAULT 0,
	`completed` integer DEFAULT 0,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `luukahead_project`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `luukahead_work_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `luukahead_item_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`priority_id`) REFERENCES `luukahead_priorities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `luukahead_user`(`id`) ON UPDATE no action ON DELETE no action
);
