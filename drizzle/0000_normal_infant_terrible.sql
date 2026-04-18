CREATE TABLE `song_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`song_id` text NOT NULL,
	`raw_text` text NOT NULL,
	`parsed_sections` text NOT NULL,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `song_contents_song_id_idx` ON `song_contents` (`song_id`);--> statement-breakpoint
CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`source_url` text NOT NULL,
	`tuning` text,
	`capo` integer,
	`difficulty` text,
	`duration_seconds` integer,
	`scroll_speed` real,
	`scroll_mode` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `songs_source_url_unique` ON `songs` (`source_url`);--> statement-breakpoint
CREATE INDEX `songs_artist_idx` ON `songs` (`artist`);