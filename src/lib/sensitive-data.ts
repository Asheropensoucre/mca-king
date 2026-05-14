import type { FormData, OwnerInfo } from '../../types'

export function maskLast4(value: string | null | undefined): string {
  if (!value) return ''
  const digits = String(value).replace(/\D/g, '')
  if (digits.length <= 4) return digits ? `••••${digits}` : ''
  return `••••${digits.slice(-4)}`
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/\b\d{2}-?\d{7}\b/g, '[REDACTED_TAX_ID]')
}

export function sanitizeOwnerForDisplay(owner: OwnerInfo, options?: { revealSensitive?: boolean }): OwnerInfo {
  if (options?.revealSensitive) return owner
  return {
    ...owner,
    ssn: maskLast4(owner.ssn),
    dateOfBirth: owner.dateOfBirth ? '••/••/••••' : '',
    signature: owner.signature ? '[SIGNATURE_ON_FILE]' : '',
  }
}

export function sanitizeMerchantForDisplay(merchant: FormData, options?: { revealSensitive?: boolean }): FormData {
  if (options?.revealSensitive) return merchant
  return {
    ...merchant,
    businessInfo: {
      ...merchant.businessInfo,
      taxId: maskLast4(merchant.businessInfo.taxId),
    },
    owners: (merchant.owners ?? []).map(owner => sanitizeOwnerForDisplay(owner)),
    agreements: {
      ...merchant.agreements,
      signatureDataUrl: merchant.agreements.signatureDataUrl ? '[SIGNATURE_ON_FILE]' : '',
    },
  }
}

export function sanitizeMerchantForAiContext(merchant: FormData): Partial<FormData> {
  const safe = sanitizeMerchantForDisplay(merchant)
  return {
    id: safe.id,
    businessInfo: {
      ...safe.businessInfo,
      taxId: safe.businessInfo.taxId ? '[REDACTED]' : '',
    },
    owners: safe.owners.map(owner => ({
      ...owner,
      homeAddress: owner.homeAddress ? '[REDACTED]' : '',
      ssn: owner.ssn ? '[REDACTED]' : '',
      dateOfBirth: owner.dateOfBirth ? '[REDACTED]' : '',
      signature: owner.signature ? '[REDACTED]' : '',
    })),
    status: safe.status,
    requestedAmount: safe.requestedAmount,
    salesRepId: safe.salesRepId,
    matchedLenderIds: safe.matchedLenderIds,
    updated_at: safe.updated_at,
  }
}
