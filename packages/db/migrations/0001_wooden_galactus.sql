CREATE TABLE `laps` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`driver_id` text NOT NULL,
	`lap` integer NOT NULL,
	`position` integer,
	`time_ms` integer,
	PRIMARY KEY(`season`, `round`, `driver_id`, `lap`)
);
--> statement-breakpoint
CREATE TABLE `pit_stops` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`driver_id` text NOT NULL,
	`stop` integer NOT NULL,
	`lap` integer NOT NULL,
	`time_of_day` text NOT NULL,
	`duration` text NOT NULL,
	`duration_ms` integer,
	PRIMARY KEY(`season`, `round`, `driver_id`, `stop`),
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `qualifying` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`driver_id` text NOT NULL,
	`constructor_id` text NOT NULL,
	`car_number` integer,
	`position` integer,
	`q1` text,
	`q2` text,
	`q3` text,
	PRIMARY KEY(`season`, `round`, `driver_id`),
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`constructor_id`) REFERENCES `constructors`(`id`) ON UPDATE no action ON DELETE no action
);
