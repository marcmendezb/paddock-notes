CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`lang` text NOT NULL,
	`status` text NOT NULL,
	`confirm_hash` text,
	`confirm_expires_at` integer,
	`unsubscribe_token` text NOT NULL,
	`created_at` integer NOT NULL,
	`confirmed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_unique` ON `newsletter_subscribers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_unsubscribe_token_unique` ON `newsletter_subscribers` (`unsubscribe_token`);--> statement-breakpoint
CREATE INDEX `newsletter_status_idx` ON `newsletter_subscribers` (`status`,`lang`);--> statement-breakpoint
ALTER TABLE `users` ADD `notify_race` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_analysis` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `email_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_token_unique` ON `users` (`email_token`);