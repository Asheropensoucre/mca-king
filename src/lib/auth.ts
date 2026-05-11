import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  database: {
    provider: 'pg',
    url: process.env.SUPABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
  session: {
    strategy: 'database',
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'merchant',
        input: true,
      },
      full_name: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
})
