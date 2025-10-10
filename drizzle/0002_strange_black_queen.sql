PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_luukahead_work_items` (
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
	`status` text DEFAULT 'todo' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `luukahead_project`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `luukahead_work_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `luukahead_item_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`priority_id`) REFERENCES `luukahead_priorities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `luukahead_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_luukahead_work_items`("id", "project_id", "parent_id", "type_id", "priority_id", "title", "description", "remarks", "deadline", "owner_id", "is_root", "created_at", "updated_at", "status") 
SELECT "id", "project_id", "parent_id", "type_id", "priority_id", "title", "description", "remarks", "deadline", "owner_id", "is_root", "created_at", "updated_at", 
  CASE WHEN "completed" = 1 THEN 'done' ELSE 'todo' END 
FROM `luukahead_work_items`;--> statement-breakpoint
DROP TABLE `luukahead_work_items`;--> statement-breakpoint
ALTER TABLE `__new_luukahead_work_items` RENAME TO `luukahead_work_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;