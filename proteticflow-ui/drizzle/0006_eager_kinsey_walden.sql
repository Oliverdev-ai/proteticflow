CREATE TABLE `lab_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`labName` varchar(256) NOT NULL DEFAULT 'Laboratório de Prótese',
	`cnpj` varchar(18),
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`city` varchar(128),
	`state` varchar(2),
	`zipCode` varchar(10),
	`logoUrl` text,
	`reportHeader` text,
	`reportFooter` text,
	`primaryColor` varchar(7) DEFAULT '#1a56db',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lab_settings_id` PRIMARY KEY(`id`)
);
