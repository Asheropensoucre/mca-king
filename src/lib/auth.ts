import { betterAuth } from 'better-auth'
import { PostgresDialect } from 'kysely'
import pg from 'pg'

const { Pool } = pg

export const auth = betterAuth({
  database: {
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
    type: 'postgres',
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  user: {
    modelName: 'users',
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
