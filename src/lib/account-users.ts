import type { UserRole, UserProfile } from '../../types'
import { supabaseAdmin } from './supabase-server'

export type AccountUserRow = {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  name: string | null
  is_disabled: boolean
  disabled_at: string | null
  closed_at: string | null
  last_login_at: string | null
  created_at: string | null
  createdAt: string | null
  updatedAt?: string | null
}

export type AccountUserWithPassword = AccountUserRow & {
  account?: { password: string | null } | null
}

export const USER_ROLES: UserRole[] = ['admin', 'sales_rep', 'merchant', 'lender']

export function isUserRole(value: string | null | undefined): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole)
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function toUserProfile(row: AccountUserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    full_name: row.full_name ?? row.name,
    is_disabled: Boolean(row.is_disabled),
    disabled_at: row.disabled_at,
    closed_at: row.closed_at,
    last_login_at: row.last_login_at,
    created_at: row.created_at ?? row.createdAt ?? '',
  }
}

export async function getAccountUserById(id: string): Promise<AccountUserRow | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email,role,full_name,name,is_disabled,disabled_at,closed_at,last_login_at,created_at,createdAt,updatedAt')
    .eq('id', id)
    .maybeSingle<AccountUserRow>()

  if (error) throw new Error(error.message)
  return data ?? null
}

export async function emailBelongsToAnotherUser(email: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', normalizeEmail(email))
    .neq('id', userId)
    .maybeSingle<{ id: string }>()

  if (error) throw new Error(error.message)
  return Boolean(data)
}
