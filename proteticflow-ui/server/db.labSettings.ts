/**
 * db.labSettings.ts — ProteticFlow
 * Helpers para configurações do laboratório (singleton id=1).
 * Usado na geração de PDFs (header, footer, logo, CNPJ).
 */
import { getDb } from "./db";
import { labSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Defaults ─────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  labName: "Laboratório de Prótese",
  cnpj: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  address: null as string | null,
  city: null as string | null,
  state: null as string | null,
  zipCode: null as string | null,
  logoUrl: null as string | null,
  reportHeader: null as string | null,
  reportFooter: "Documento gerado pelo ProteticFlow",
  primaryColor: "#1a56db",
};

// ─── Queries ──────────────────────────────────────────────

/**
 * Retorna as configurações do laboratório (sempre id=1).
 * Se ainda não existe, retorna os defaults sem persistir.
 */
export async function getLabSettings() {
  const db = await getDb();
  if (!db) return { id: 1, ...DEFAULT_SETTINGS, updatedAt: new Date() };

  const rows = await db.select().from(labSettings).where(eq(labSettings.id, 1)).limit(1);
  if (rows.length === 0) return { id: 1, ...DEFAULT_SETTINGS, updatedAt: new Date() };
  return rows[0];
}

/**
 * Cria ou atualiza as configurações do laboratório (upsert no id=1).
 */
export async function upsertLabSettings(data: {
  labName?: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  logoUrl?: string | null;
  reportHeader?: string | null;
  reportFooter?: string | null;
  primaryColor?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const existing = await db.select({ id: labSettings.id }).from(labSettings).where(eq(labSettings.id, 1)).limit(1);

  if (existing.length === 0) {
    // INSERT com id=1 explícito
    await db.insert(labSettings).values({
      id: 1,
      labName: data.labName ?? DEFAULT_SETTINGS.labName,
      cnpj: data.cnpj ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zipCode: data.zipCode ?? null,
      logoUrl: data.logoUrl ?? null,
      reportHeader: data.reportHeader ?? null,
      reportFooter: data.reportFooter ?? DEFAULT_SETTINGS.reportFooter,
      primaryColor: data.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
    });
  } else {
    // UPDATE
    const updateData: Record<string, any> = {};
    if (data.labName !== undefined) updateData.labName = data.labName;
    if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.reportHeader !== undefined) updateData.reportHeader = data.reportHeader;
    if (data.reportFooter !== undefined) updateData.reportFooter = data.reportFooter;
    if (data.primaryColor !== undefined) updateData.primaryColor = data.primaryColor;

    if (Object.keys(updateData).length > 0) {
      await db.update(labSettings).set(updateData).where(eq(labSettings.id, 1));
    }
  }

  return getLabSettings();
}
