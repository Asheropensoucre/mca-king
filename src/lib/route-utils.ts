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

export function getId(context?: RouteContext): string | null {
  return context?.params?.id ?? null
}

export async function readJson<T extends object>(req: Request): Promise<Partial<T>> {
  try {
    return await req.json() as Partial<T>
  } catch {
    return {}
  }
}
