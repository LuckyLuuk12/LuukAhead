-- Disable foreign key constraints
PRAGMA foreign_keys=OFF;

-- Create new table with updated schema
CREATE TABLE `__new_luukahead_user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text,
	`google_id` text
);

-- Copy existing data (only columns that exist in old table)
INSERT INTO `__new_luukahead_user`("id", "age", "username", "password_hash") 
SELECT "id", "age", "username", "password_hash" FROM `luukahead_user`;

-- Drop old table
DROP TABLE `luukahead_user`;

-- Rename new table
ALTER TABLE `__new_luukahead_user` RENAME TO `luukahead_user`;

-- Recreate indexes
CREATE UNIQUE INDEX `luukahead_user_username_unique` ON `luukahead_user` (`username`);
CREATE UNIQUE INDEX `luukahead_user_google_id_unique` ON `luukahead_user` (`google_id`);

-- Re-enable foreign key constraints
PRAGMA foreign_keys=ON;