import type { SendResult } from '../types'

export async function sendDisabledSms(): Promise<SendResult> {
  return {
    ok: false,
    provider: 'sms-disabled',
    error: 'SMS is not enabled. Provider selection, A2P/10DLC registration, STOP/HELP handling, quiet hours, consent proof, and budget approval are required before activation.',
  }
}
