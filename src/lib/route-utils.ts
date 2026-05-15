export type UserRole = 'admin' | 'sales_rep' | 'merchant' | 'lender'

export type RouteUser = {
  id: string
  email: string
  role: UserRole
  full_name?: string | null
}

export type RouteParams = Record<string, string>

export type RouteContext = {
  params?: RouteParams
}

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init)
}

export function badRequest(message = 'Bad request'): Response {
  return new Response(message, { status: 400 })
}

export function forbidden(message = 'Forbidden'): Response {
  return new Response(message, { status: 403 })
}

export function notFound(message = 'Not found'): Response {
  return new Response(message, { status: 404 })
}

export function assertRole(user: RouteUser, roles: UserRole[]): Response | null {
  return roles.includes(user.role) ? null : forbidden()
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function getId(context?: RouteContext): string | null {
  const id = context?.params?.id ?? null
  return isUuid(id) ? id : null
}

export async function readJson<T extends object>(req: Request): Promise<Partial<T>> {
  try {
    return await req.json() as Partial<T>
  } catch {
    return {}
  }
}
