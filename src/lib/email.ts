import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) throw new Error('Missing RESEND_API_KEY')

const fromAddress = process.env.EMAIL_FROM
if (!fromAddress) throw new Error('Missing EMAIL_FROM')

const appUrl = process.env.BETTER_AUTH_URL
if (!appUrl) throw new Error('Missing BETTER_AUTH_URL')

export const resend = new Resend(apiKey)
export const FROM = fromAddress
export const APP_URL = appUrl
