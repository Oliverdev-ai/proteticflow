CREATE TABLE `deadline_notif_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`notifiedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deadline_notif_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`token` varchar(128) NOT NULL,
	`invite_status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`invitedBy` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;