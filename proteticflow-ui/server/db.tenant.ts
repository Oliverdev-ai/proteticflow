/**
 * db.tenant.ts — Helpers de banco de dados para multi-tenant
 *
 * Responsabilidades:
 * - Criar e gerenciar tenants (laboratórios)
 * - Associar usuários a tenants com roles
 * - Resolver tenant ativo do usuário
 * - Trocar tenant ativo
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { tenants, tenantMembers, users } from "../drizzle/schema";
import type { Tenant, TenantMember } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

// ─── Types ────────────────────────────────────────────────────

export type TenantWithRole = Tenant & { userRole: "admin" | "technician" | "viewer" };

export type TenantMemberWithUser = TenantMember & {
  userName: string | null;
  userEmail: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Gera slug único a partir do nome do tenant.
 * Ex: "Lab Dental Silva" → "lab-dental-silva"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

/**
 * Retorna o tenantId ativo do usuário.
 * Prioridade: activeTenantId do user → primeiro tenant do qual é membro.
 * Retorna null se o usuário não tem nenhum tenant.
 */
export async function resolveActiveTenantId(userId: number): Promise<number | null> {
  const db = await getDb();

  // 1. Verificar activeTenantId do usuário
  const [user] = await db
    .select({ activeTenantId: users.activeTenantId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.activeTenantId) {
    // Verificar se ainda é membro ativo desse tenant
    const [membership] = await db
      .select({ id: tenantMembers.id })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, user.activeTenantId),
          eq(tenantMembers.isActive, true)
        )
      )
      .limit(1);

    if (membership) return user.activeTenantId;
  }

  // 2. Fallback: primeiro tenant ativo do usuário
  const [firstMembership] = await db
    .select({ tenantId: tenantMembers.tenantId })
    .from(tenantMembers)
    .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.isActive, true)))
    .limit(1);

  if (firstMembership) {
    // Atualizar activeTenantId para o primeiro encontrado
    await db
      .update(users)
      .set({ activeTenantId: firstMembership.tenantId })
      .where(eq(users.id, userId));
    return firstMembership.tenantId;
  }

  return null;
}

/**
 * Lista todos os tenants ativos do usuário com seu role em cada um.
 */
export async function getUserTenants(userId: number): Promise<TenantWithRole[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      plan: tenants.plan,
      planExpiresAt: tenants.planExpiresAt,
      logoUrl: tenants.logoUrl,
      cnpj: tenants.cnpj,
      phone: tenants.phone,
      email: tenants.email,
      address: tenants.address,
      city: tenants.city,
      state: tenants.state,
      isActive: tenants.isActive,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      userRole: tenantMembers.role,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(
      and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.isActive, true),
        eq(tenants.isActive, true)
      )
    );

  return rows as TenantWithRole[];
}

/**
 * Retorna um tenant por ID.
 */
export async function getTenantById(tenantId: number): Promise<Tenant | null> {
  const db = await getDb();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.isActive, true)))
    .limit(1);
  return tenant ?? null;
}

/**
 * Retorna o role do usuário em um tenant específico.
 */
export async function getUserRoleInTenant(
  userId: number,
  tenantId: number
): Promise<"admin" | "technician" | "viewer" | null> {
  const db = await getDb();
  const [membership] = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.isActive, true)
      )
    )
    .limit(1);
  return membership?.role ?? null;
}

/**
 * Cria um novo tenant e adiciona o criador como admin.
 */
export async function createTenant(
  data: {
    name: string;
    slug: string;
    cnpj?: string;
    phone?: string;
    email?: string;
  },
  ownerId: number
): Promise<Tenant> {
  const db = await getDb();

  // Verificar slug único
  const [existing] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, data.slug))
    .limit(1);

  if (existing) {
    // Adicionar sufixo numérico para garantir unicidade
    data.slug = `${data.slug}-${Date.now().toString(36)}`;
  }

  // Criar tenant
  const result = await db.insert(tenants).values({
    name: data.name,
    slug: data.slug,
    plan: "trial",
    cnpj: data.cnpj,
    phone: data.phone,
    email: data.email,
    isActive: true,
  });

  const tenantId = (result as any).insertId as number;

  // Adicionar owner como admin
  await db.insert(tenantMembers).values({
    tenantId,
    userId: ownerId,
    role: "admin",
    isActive: true,
  });

  // Definir como tenant ativo do usuário
  await db
    .update(users)
    .set({ activeTenantId: tenantId })
    .where(eq(users.id, ownerId));

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return tenant;
}

/**
 * Troca o tenant ativo do usuário.
 * Valida que o usuário é membro ativo do tenant alvo.
 */
export async function switchTenant(userId: number, tenantId: number): Promise<void> {
  const db = await getDb();

  const [membership] = await db
    .select({ id: tenantMembers.id })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.isActive, true)
      )
    )
    .limit(1);

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User is not a member of this tenant",
    });
  }

  await db
    .update(users)
    .set({ activeTenantId: tenantId })
    .where(eq(users.id, userId));
}

/**
 * Lista todos os membros ativos de um tenant.
 */
export async function getTenantMembers(tenantId: number): Promise<TenantMemberWithUser[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: tenantMembers.id,
      tenantId: tenantMembers.tenantId,
      userId: tenantMembers.userId,
      role: tenantMembers.role,
      isActive: tenantMembers.isActive,
      joinedAt: tenantMembers.joinedAt,
      updatedAt: tenantMembers.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(
      and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.isActive, true))
    );

  return rows as TenantMemberWithUser[];
}

/**
 * Remove um membro do tenant (soft delete — isActive = false).
 */
export async function removeTenantMember(tenantId: number, userId: number): Promise<void> {
  const db = await getDb();

  await db
    .update(tenantMembers)
    .set({ isActive: false })
    .where(
      and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId))
    );
}

/**
 * Atualiza o role de um membro no tenant.
 */
export async function updateMemberRole(
  tenantId: number,
  userId: number,
  role: "admin" | "technician" | "viewer"
): Promise<void> {
  const db = await getDb();

  await db
    .update(tenantMembers)
    .set({ role })
    .where(
      and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId))
    );
}

/**
 * Atualiza dados do tenant.
 */
export async function updateTenant(
  tenantId: number,
  data: Partial<Pick<Tenant, "name" | "cnpj" | "phone" | "email" | "address" | "city" | "state" | "logoUrl">>
): Promise<void> {
  const db = await getDb();

  await db
    .update(tenants)
    .set(data)
    .where(eq(tenants.id, tenantId));
}
