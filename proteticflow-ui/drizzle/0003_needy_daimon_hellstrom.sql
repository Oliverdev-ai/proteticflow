CREATE TABLE `accounts_payable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`description` varchar(512) NOT NULL,
	`supplier` varchar(255),
	`category` varchar(128),
	`amount` decimal(10,2) NOT NULL,
	`dueDate` timestamp NOT NULL,
	`paidAt` timestamp,
	`ap_status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_payable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accounts_receivable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`clientId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`description` varchar(512),
	`dueDate` timestamp NOT NULL,
	`paidAt` timestamp,
	`ar_status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_receivable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_closings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`period` varchar(7) NOT NULL,
	`totalJobs` int NOT NULL DEFAULT 0,
	`totalAmount` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`pendingAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`closing_status` enum('open','closed','paid') NOT NULL DEFAULT 'open',
	`closedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_closings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`blockStart` int NOT NULL,
	`blockEnd` int NOT NULL,
	`description` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `orderNumber` int;--> statement-breakpoint
ALTER TABLE `jobs` ADD `patientName` varchar(255);--> statement-breakpoint
ALTER TABLE `jobs` ADD `deliveredAt` timestamp;--> statement-breakpoint
CREATE INDEX `ap_status_idx` ON `accounts_payable` (`ap_status`);--> statement-breakpoint
CREATE INDEX `ap_due_date_idx` ON `accounts_payable` (`dueDate`);--> statement-breakpoint
CREATE INDEX `ar_client_idx` ON `accounts_receivable` (`clientId`);--> statement-breakpoint
CREATE INDEX `ar_status_idx` ON `accounts_receivable` (`ar_status`);--> statement-breakpoint
CREATE INDEX `closing_client_period_idx` ON `financial_closings` (`clientId`,`period`);--> statement-breakpoint
CREATE INDEX `order_blocks_client_idx` ON `order_blocks` (`clientId`);--> statement-breakpoint
CREATE INDEX `order_blocks_start_idx` ON `order_blocks` (`blockStart`);--> statement-breakpoint
CREATE INDEX `jobs_order_number_idx` ON `jobs` (`orderNumber`);--> statement-breakpoint
CREATE INDEX `jobs_client_idx` ON `jobs` (`clientId`);