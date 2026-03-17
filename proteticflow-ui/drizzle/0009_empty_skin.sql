CREATE TABLE `tenant_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`tenant_role` enum('admin','technician','viewer') NOT NULL DEFAULT 'technician',
	`isActive` boolean NOT NULL DEFAULT true,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`plan` enum('trial','starter','pro','enterprise') NOT NULL DEFAULT 'trial',
	`planExpiresAt` timestamp,
	`logoUrl` text,
	`cnpj` varchar(18),
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`city` varchar(128),
	`state` varchar(2),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `jobs` DROP INDEX `jobs_code_unique`;--> statement-breakpoint
ALTER TABLE `accounts_payable` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts_receivable` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `client_portal_tokens` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `financial_closings` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `invites` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `job_logs` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `lab_settings` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `material_categories` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `materials` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `order_blocks` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `price_items` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `activeTenantId` int;--> statement-breakpoint
ALTER TABLE `lab_settings` ADD CONSTRAINT `lab_settings_tenantId_unique` UNIQUE(`tenantId`);--> statement-breakpoint
ALTER TABLE `tenant_members` ADD CONSTRAINT `tenant_members_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_members` ADD CONSTRAINT `tenant_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tm_tenant_user_idx` ON `tenant_members` (`tenantId`,`userId`);--> statement-breakpoint
CREATE INDEX `tm_user_idx` ON `tenant_members` (`userId`);--> statement-breakpoint
CREATE INDEX `tm_tenant_idx` ON `tenant_members` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenants_slug_idx` ON `tenants` (`slug`);--> statement-breakpoint
CREATE INDEX `tenants_active_idx` ON `tenants` (`isActive`);--> statement-breakpoint
CREATE INDEX `ap_tenant_idx` ON `accounts_payable` (`tenantId`);--> statement-breakpoint
CREATE INDEX `ar_tenant_idx` ON `accounts_receivable` (`tenantId`);--> statement-breakpoint
CREATE INDEX `chat_tenant_user_idx` ON `chat_messages` (`tenantId`,`userId`);--> statement-breakpoint
CREATE INDEX `cpt_tenant_idx` ON `client_portal_tokens` (`tenantId`);--> statement-breakpoint
CREATE INDEX `clients_tenant_idx` ON `clients` (`tenantId`);--> statement-breakpoint
CREATE INDEX `closing_tenant_idx` ON `financial_closings` (`tenantId`);--> statement-breakpoint
CREATE INDEX `job_logs_tenant_idx` ON `job_logs` (`tenantId`);--> statement-breakpoint
CREATE INDEX `jobs_tenant_idx` ON `jobs` (`tenantId`);--> statement-breakpoint
CREATE INDEX `jobs_tenant_code_idx` ON `jobs` (`tenantId`,`code`);--> statement-breakpoint
CREATE INDEX `lab_settings_tenant_idx` ON `lab_settings` (`tenantId`);--> statement-breakpoint
CREATE INDEX `mat_cat_tenant_idx` ON `material_categories` (`tenantId`);--> statement-breakpoint
CREATE INDEX `mat_tenant_idx` ON `materials` (`tenantId`);--> statement-breakpoint
CREATE INDEX `notif_tenant_user_idx` ON `notifications` (`tenantId`,`userId`);--> statement-breakpoint
CREATE INDEX `order_blocks_tenant_idx` ON `order_blocks` (`tenantId`);--> statement-breakpoint
CREATE INDEX `price_items_tenant_idx` ON `price_items` (`tenantId`);--> statement-breakpoint
CREATE INDEX `sm_tenant_idx` ON `stock_movements` (`tenantId`);--> statement-breakpoint
CREATE INDEX `suppliers_tenant_idx` ON `suppliers` (`tenantId`);