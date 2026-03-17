CREATE TABLE `material_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`color` varchar(32) DEFAULT 'slate',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `material_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int,
	`supplierId` int,
	`name` varchar(255) NOT NULL,
	`unit` varchar(32) NOT NULL DEFAULT 'un',
	`currentStock` decimal(10,3) NOT NULL DEFAULT '0',
	`minStock` decimal(10,3) NOT NULL DEFAULT '0',
	`maxStock` decimal(10,3),
	`costPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`movement_type` enum('in','out','adjustment') NOT NULL,
	`quantity` decimal(10,3) NOT NULL,
	`stockAfter` decimal(10,3) NOT NULL,
	`reason` varchar(512),
	`jobId` int,
	`invoiceNumber` varchar(128),
	`unitCost` decimal(10,2),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contact` varchar(255),
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `mat_category_idx` ON `materials` (`categoryId`);--> statement-breakpoint
CREATE INDEX `mat_supplier_idx` ON `materials` (`supplierId`);--> statement-breakpoint
CREATE INDEX `mat_active_idx` ON `materials` (`isActive`);--> statement-breakpoint
CREATE INDEX `sm_material_idx` ON `stock_movements` (`materialId`);--> statement-breakpoint
CREATE INDEX `sm_type_idx` ON `stock_movements` (`movement_type`);--> statement-breakpoint
CREATE INDEX `sm_created_at_idx` ON `stock_movements` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sm_job_idx` ON `stock_movements` (`jobId`);