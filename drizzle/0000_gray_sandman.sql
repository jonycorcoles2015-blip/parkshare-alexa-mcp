CREATE TABLE `road_alert_votes` (
	`alert_id` text NOT NULL,
	`user_id` text NOT NULL,
	`vote` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`alert_id`, `user_id`),
	FOREIGN KEY (`alert_id`) REFERENCES `road_alerts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_road_alert_votes_alert` ON `road_alert_votes` (`alert_id`);--> statement-breakpoint
CREATE TABLE `road_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`address` text DEFAULT 'Ubicacion GPS confirmada' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`reporter_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`confirmations` integer DEFAULT 1 NOT NULL,
	`denials` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_confirmed_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_road_alerts_active_expiry` ON `road_alerts` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_road_alerts_coordinates` ON `road_alerts` (`latitude`,`longitude`);