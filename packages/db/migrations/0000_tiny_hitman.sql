CREATE TABLE `circuits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`locality` text NOT NULL,
	`country` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `constructors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`nationality` text
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text,
	`number` integer,
	`given_name` text NOT NULL,
	`family_name` text NOT NULL,
	`date_of_birth` text,
	`nationality` text
);
--> statement-breakpoint
CREATE TABLE `ingest_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`rows_written` integer DEFAULT 0 NOT NULL,
	`detail` text
);
--> statement-breakpoint
CREATE INDEX `ingest_runs_started_idx` ON `ingest_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `ingest_state` (
	`resource` text PRIMARY KEY NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `races` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`name` text NOT NULL,
	`circuit_id` text NOT NULL,
	`date` text NOT NULL,
	`starts_at` text,
	`is_sprint_weekend` integer DEFAULT false NOT NULL,
	`cancelled` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`season`, `round`),
	FOREIGN KEY (`circuit_id`) REFERENCES `circuits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `races_date_idx` ON `races` (`date`);--> statement-breakpoint
CREATE TABLE `results` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`kind` text NOT NULL,
	`driver_id` text NOT NULL,
	`constructor_id` text NOT NULL,
	`car_number` integer DEFAULT 0 NOT NULL,
	`position` integer,
	`position_text` text NOT NULL,
	`grid` integer,
	`laps` integer NOT NULL,
	`status` text NOT NULL,
	`time_text` text,
	`millis` integer,
	`points` real NOT NULL,
	`fastest_lap_rank` integer,
	`fastest_lap_lap` integer,
	`fastest_lap_time` text,
	PRIMARY KEY(`season`, `round`, `kind`, `driver_id`, `constructor_id`, `car_number`),
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`constructor_id`) REFERENCES `constructors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `results_driver_idx` ON `results` (`driver_id`);--> statement-breakpoint
CREATE INDEX `results_position_idx` ON `results` (`season`,`kind`,`position`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`starts_at` text,
	PRIMARY KEY(`season`, `round`, `kind`)
);
--> statement-breakpoint
CREATE INDEX `sessions_starts_at_idx` ON `sessions` (`starts_at`);--> statement-breakpoint
CREATE TABLE `standings_constructors` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`constructor_id` text NOT NULL,
	`position` integer,
	`position_text` text NOT NULL,
	`points` real NOT NULL,
	`wins` integer NOT NULL,
	PRIMARY KEY(`season`, `round`, `constructor_id`),
	FOREIGN KEY (`constructor_id`) REFERENCES `constructors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `standings_drivers` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`driver_id` text NOT NULL,
	`position` integer,
	`position_text` text NOT NULL,
	`points` real NOT NULL,
	`wins` integer NOT NULL,
	`constructor_ids` text NOT NULL,
	PRIMARY KEY(`season`, `round`, `driver_id`),
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action
);
