import { revalidatePath } from 'next/cache'
import { guardAdminApi } from '@/lib/auth'
import { jsonError, parseJsonBody } from '@/lib/admin/api'
import { getOverriddenSections, getSettings, resetSettingsSection, saveSettingsSection } from '@/lib/settings'
import { SECTION_SCHEMAS, isSettingsSection, type SettingsSection } from '@/lib/settings-schema'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ section: string }> }

async function sectionOf(ctx: Ctx): Promise<SettingsSection | null> {
  const { section } = await ctx.params
  return isSettingsSection(section) ? section : null
}

/** Las páginas públicas y los emails leen los ajustes: tras un cambio, todo se vuelve a generar. */
function revalidateSite() {
  revalidatePath('/', 'layout')
}

/** GET → { section, value, overridden } (valores efectivos de la sección). */
export async function GET(req: Request, ctx: Ctx) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const section = await sectionOf(ctx)
  if (!section) return jsonError('No encontrado', 404)
  const [settings, overridden] = await Promise.all([getSettings(), getOverriddenSections()])
  return Response.json({ section, value: settings[section], overridden: overridden.includes(section) })
}

/** POST { ...sección completa } → guarda la sección (validada con su esquema). */
export async function POST(req: Request, ctx: Ctx) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const section = await sectionOf(ctx)
  if (!section) return jsonError('No encontrado', 404)
  const body = await parseJsonBody(req, SECTION_SCHEMAS[section])
  if (!body.ok) return body.response
  await saveSettingsSection(section, body.data)
  revalidateSite()
  return Response.json({ ok: true })
}

/** DELETE → la sección vuelve a los valores por defecto definidos en código. */
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await guardAdminApi(req)
  if (denied) return denied
  const section = await sectionOf(ctx)
  if (!section) return jsonError('No encontrado', 404)
  await resetSettingsSection(section)
  revalidateSite()
  return Response.json({ ok: true })
}
