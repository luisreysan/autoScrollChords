CREATE TABLE `sync_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host_secret` text NOT NULL,
	`song_id` text NOT NULL,
	`scroll_ratio` real DEFAULT 0 NOT NULL,
	`is_playing` integer DEFAULT 0 NOT NULL,
	`manual_speed` real DEFAULT 0.2 NOT NULL,
	`font_step` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL
);
