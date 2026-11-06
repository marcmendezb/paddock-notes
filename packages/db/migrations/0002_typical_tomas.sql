CREATE TABLE `analysis_artifacts` (
	`season` integer NOT NULL,
	`round` integer NOT NULL,
	`version` integer NOT NULL,
	`session_key` integer NOT NULL,
	`tools` text NOT NULL,
	`telemetry_drivers` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`season`, `round`)
);
