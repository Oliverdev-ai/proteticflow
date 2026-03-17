CREATE TABLE `client_portal_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`label` varchar(128) DEFAULT 'Acesso padrão',
	`expiresAt` timestamp NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastAccessAt` timestamp,
	`accessCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `client_portal_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_portal_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `client_portal_tokens` ADD CONSTRAINT `client_portal_tokens_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cpt_token_idx` ON `client_portal_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `cpt_client_idx` ON `client_portal_tokens` (`clientId`);--> statement-breakpoint
CREATE INDEX `cpt_active_idx` ON `client_portal_tokens` (`isActive`);