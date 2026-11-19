CREATE TABLE `provisional_results` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`driver_id` text NOT NULL,
	`constructor_id` text NOT NULL,
	`position` integer,
	`position_text` text NOT NULL,
	`laps` integer NOT NULL,
	`status` text NOT NULL,
	`time_text` text,
	`points` real NOT NULL,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`season`, `round`, `driver_id`),
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`constructor_id`) REFERENCES `constructors`(`id`) ON UPDATE no action ON DELETE no action
);
