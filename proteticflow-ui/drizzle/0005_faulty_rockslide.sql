CREATE TABLE `job_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`fromStatus` varchar(64),
	`toStatus` varchar(64) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `assignedTo` int;--> statement-breakpoint
CREATE INDEX `job_logs_job_idx` ON `job_logs` (`jobId`);--> statement-breakpoint
CREATE INDEX `job_logs_created_at_idx` ON `job_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `jobs_assigned_to_idx` ON `jobs` (`assignedTo`);