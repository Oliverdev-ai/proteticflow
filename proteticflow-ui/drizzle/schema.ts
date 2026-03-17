import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

// ─── Tenants (laboratórios) ─────────────────────────────────
// Cada tenant é um laboratório protético independente.
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  plan: mysqlEnum("plan", ["trial", "starter", "pro", "enterprise"]).default("trial").notNull(),
  planExpiresAt: timestamp("planExpiresAt"),
  logoUrl: text("logoUrl"),
  cnpj: varchar("cnpj", { length: 18 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugIdx: index("tenants_slug_idx").on(table.slug),
  activeIdx: index("tenants_active_idx").on(table.isActive),
}));

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── Membros do Tenant ──────────────────────────────────────
// Associação usuário ↔ tenant com role específico no laboratório.
export const tenantMembers = mysqlTable("tenant_members", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Role dentro do tenant (independente do role global do usuário)
  role: mysqlEnum("tenant_role", ["admin", "technician", "viewer"]).default("technician").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantUserIdx: index("tm_tenant_user_idx").on(table.tenantId, table.userId),
  userIdx: index("tm_user_idx").on(table.userId),
  tenantIdx: index("tm_tenant_idx").on(table.tenantId),
}));

export type TenantMember = typeof tenantMembers.$inferSelect;
export type InsertTenantMember = typeof tenantMembers.$inferInsert;

// ─── Users (auth) ───────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Tenant ativo do usuário (pode ter múltiplos tenants)
  activeTenantId: int("activeTenantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Convites ──────────────────────────────────────────────
export const invites = mysqlTable("invites", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("invite_status", ["pending", "accepted", "expired"]).default("pending").notNull(),
  invitedBy: int("invitedBy").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

// ─── Deadline Notifications Log (evitar duplicatas) ────────
export const deadlineNotifLog = mysqlTable("deadline_notif_log", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  notifiedAt: timestamp("notifiedAt").defaultNow().notNull(),
});

export type DeadlineNotifLog = typeof deadlineNotifLog.$inferSelect;
export type InsertDeadlineNotifLog = typeof deadlineNotifLog.$inferInsert;

// ─── Clientes (dentistas / clínicas) ────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  clinic: varchar("clinic", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 2 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  totalJobs: int("totalJobs").default(0).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("clients_tenant_idx").on(table.tenantId),
}));

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Blocos de OS por Cliente ──────────────────────────────
export const orderBlocks = mysqlTable("order_blocks", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  clientId: int("clientId").notNull(),
  blockStart: int("blockStart").notNull(),
  blockEnd: int("blockEnd").notNull(),
  description: varchar("description", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("order_blocks_tenant_idx").on(table.tenantId),
  clientIdx: index("order_blocks_client_idx").on(table.clientId),
  blockStartIdx: index("order_blocks_start_idx").on(table.blockStart),
}));

export type OrderBlock = typeof orderBlocks.$inferSelect;
export type InsertOrderBlock = typeof orderBlocks.$inferInsert;

// ─── Tabela de Preços ───────────────────────────────────────
export const priceItems = mysqlTable("price_items", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }).notNull(),
  material: varchar("material", { length: 255 }),
  estimatedDays: int("estimatedDays").default(5).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("price_items_tenant_idx").on(table.tenantId),
}));

export type PriceItem = typeof priceItems.$inferSelect;
export type InsertPriceItem = typeof priceItems.$inferInsert;

// ─── Trabalhos (ordens de serviço) ──────────────────────────
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  orderNumber: int("orderNumber"),
  clientId: int("clientId").notNull(),
  priceItemId: int("priceItemId"),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  patientName: varchar("patientName", { length: 255 }),
  tooth: varchar("tooth", { length: 32 }),
  status: mysqlEnum("status", [
    "waiting",
    "in_production",
    "review",
    "ready",
    "delivered",
    "overdue",
  ]).default("waiting").notNull(),
  progress: int("progress").default(0).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  deadline: timestamp("deadline").notNull(),
  deliveredAt: timestamp("deliveredAt"),
  notes: text("notes"),
  assignedTo: int("assignedTo"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("jobs_tenant_idx").on(table.tenantId),
  tenantCodeIdx: index("jobs_tenant_code_idx").on(table.tenantId, table.code),
  orderNumberIdx: index("jobs_order_number_idx").on(table.orderNumber),
  clientIdx: index("jobs_client_idx").on(table.clientId),
  assignedToIdx: index("jobs_assigned_to_idx").on(table.assignedTo),
}));

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ─── Job Logs (histórico de movimentações no Kanban) ────────
export const jobLogs = mysqlTable("job_logs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  jobId: int("jobId").notNull(),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  fromStatus: varchar("fromStatus", { length: 64 }),
  toStatus: varchar("toStatus", { length: 64 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("job_logs_tenant_idx").on(table.tenantId),
  jobIdx: index("job_logs_job_idx").on(table.jobId),
  createdAtIdx: index("job_logs_created_at_idx").on(table.createdAt),
}));

export type JobLog = typeof jobLogs.$inferSelect;
export type InsertJobLog = typeof jobLogs.$inferInsert;

// ─── Contas a Receber ──────────────────────────────────────
export const accountsReceivable = mysqlTable("accounts_receivable", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  jobId: int("jobId").notNull(),
  clientId: int("clientId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: varchar("description", { length: 512 }),
  dueDate: timestamp("dueDate").notNull(),
  paidAt: timestamp("paidAt"),
  status: mysqlEnum("ar_status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("ar_tenant_idx").on(table.tenantId),
  clientIdx: index("ar_client_idx").on(table.clientId),
  statusIdx: index("ar_status_idx").on(table.status),
}));

export type AccountReceivable = typeof accountsReceivable.$inferSelect;
export type InsertAccountReceivable = typeof accountsReceivable.$inferInsert;

// ─── Fechamentos Mensais ───────────────────────────────────
export const financialClosings = mysqlTable("financial_closings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  clientId: int("clientId").notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  totalJobs: int("totalJobs").default(0).notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  pendingAmount: decimal("pendingAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("closing_status", ["open", "closed", "paid"]).default("open").notNull(),
  closedAt: timestamp("closedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("closing_tenant_idx").on(table.tenantId),
  clientPeriodIdx: index("closing_client_period_idx").on(table.clientId, table.period),
}));

export type FinancialClosing = typeof financialClosings.$inferSelect;
export type InsertFinancialClosing = typeof financialClosings.$inferInsert;

// ─── Contas a Pagar ────────────────────────────────────────
export const accountsPayable = mysqlTable("accounts_payable", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  description: varchar("description", { length: 512 }).notNull(),
  supplier: varchar("supplier", { length: 255 }),
  category: varchar("category", { length: 128 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidAt: timestamp("paidAt"),
  status: mysqlEnum("ap_status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("ap_tenant_idx").on(table.tenantId),
  statusIdx: index("ap_status_idx").on(table.status),
  dueDateIdx: index("ap_due_date_idx").on(table.dueDate),
}));

export type AccountPayable = typeof accountsPayable.$inferSelect;
export type InsertAccountPayable = typeof accountsPayable.$inferInsert;

// ─── Notificações ───────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "warning", "danger", "success"]).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  relatedJobId: int("relatedJobId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantUserIdx: index("notif_tenant_user_idx").on(table.tenantId, table.userId),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Chat IA (histórico de conversas) ───────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantUserIdx: index("chat_tenant_user_idx").on(table.tenantId, table.userId),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Categorias de Materiais ────────────────────────────────
export const materialCategories = mysqlTable("material_categories", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 32 }).default("slate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("mat_cat_tenant_idx").on(table.tenantId),
}));

export type MaterialCategory = typeof materialCategories.$inferSelect;
export type InsertMaterialCategory = typeof materialCategories.$inferInsert;

// ─── Fornecedores ──────────────────────────────────────────
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("suppliers_tenant_idx").on(table.tenantId),
}));

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─── Materiais ─────────────────────────────────────────────
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  categoryId: int("categoryId"),
  supplierId: int("supplierId"),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull().default("un"),
  currentStock: decimal("currentStock", { precision: 10, scale: 3 }).default("0").notNull(),
  minStock: decimal("minStock", { precision: 10, scale: 3 }).default("0").notNull(),
  maxStock: decimal("maxStock", { precision: 10, scale: 3 }),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("mat_tenant_idx").on(table.tenantId),
  categoryIdx: index("mat_category_idx").on(table.categoryId),
  supplierIdx: index("mat_supplier_idx").on(table.supplierId),
  activeIdx: index("mat_active_idx").on(table.isActive),
}));

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

// ─── Movimentações de Estoque ──────────────────────────────
export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  materialId: int("materialId").notNull(),
  type: mysqlEnum("movement_type", ["in", "out", "adjustment"]).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  stockAfter: decimal("stockAfter", { precision: 10, scale: 3 }).notNull(),
  reason: varchar("reason", { length: 512 }),
  jobId: int("jobId"),
  invoiceNumber: varchar("invoiceNumber", { length: 128 }),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("sm_tenant_idx").on(table.tenantId),
  materialIdx: index("sm_material_idx").on(table.materialId),
  typeIdx: index("sm_type_idx").on(table.type),
  createdAtIdx: index("sm_created_at_idx").on(table.createdAt),
  jobIdx: index("sm_job_idx").on(table.jobId),
}));

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

// ─── Configurações do Laboratório ─────────────────────────
// Um registro por tenant. Contém dados do lab para relatórios PDF.
export const labSettings = mysqlTable("lab_settings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  labName: varchar("labName", { length: 256 }).notNull().default("Laboratório de Prótese"),
  cnpj: varchar("cnpj", { length: 18 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  logoUrl: text("logoUrl"),
  reportHeader: text("reportHeader"),
  reportFooter: text("reportFooter"),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#1a56db"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("lab_settings_tenant_idx").on(table.tenantId),
}));

export type LabSettings = typeof labSettings.$inferSelect;
export type InsertLabSettings = typeof labSettings.$inferInsert;

// ─── Portal do Cliente ────────────────────────────────────
export const clientPortalTokens = mysqlTable("client_portal_tokens", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).default("Acesso padrão"),
  expiresAt: timestamp("expiresAt").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastAccessAt: timestamp("lastAccessAt"),
  accessCount: int("accessCount").notNull().default(0),
}, (table) => ({
  tokenIdx: index("cpt_token_idx").on(table.token),
  tenantIdx: index("cpt_tenant_idx").on(table.tenantId),
  clientIdx: index("cpt_client_idx").on(table.clientId),
  activeIdx: index("cpt_active_idx").on(table.isActive),
}));

export type ClientPortalToken = typeof clientPortalTokens.$inferSelect;
export type InsertClientPortalToken = typeof clientPortalTokens.$inferInsert;

// ─── Push Subscriptions (PWA) ─────────────────────────────
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: varchar("auth", { length: 128 }).notNull(),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
}, (table) => ({
  userIdx: index("ps_user_idx").on(table.userId),
}));

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
