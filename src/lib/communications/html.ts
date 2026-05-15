const colors = {
  surface: '#ffffff',
  page: '#f6f7fb',
  primary: '#00236f',
  primaryContainer: '#1e3a8a',
  teal: '#006a61',
  yellow: '#ffe262',
  text: '#172033',
  muted: '#64748b',
  border: '#d8dbe8',
} as const

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function looksLikeHtml(value: string): boolean {
  return /<\s*(p|div|table|tr|td|h1|h2|h3|a|img|ul|ol|li|br|strong|span|section|article|button)\b/i.test(value)
}

export function textToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map(paragraph => `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('\n')
}

export function communicationEmailShell(title: string, body: string, preheader?: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${colors.page};font-family:Inter,Arial,sans-serif;color:${colors.text};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${colors.page};padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:${colors.surface};border:1px solid ${colors.border};border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,.12);">
            <tr>
              <td style="background:${colors.primary};padding:28px 30px;border-bottom:6px solid ${colors.yellow};">
                <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:${colors.yellow};">MCA King</div>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:#ffffff;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;font-size:16px;line-height:1.65;color:${colors.text};">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;padding:18px 30px;font-size:12px;color:${colors.muted};border-top:1px solid ${colors.border};">
                Sent from MCA King Brokerage CRM
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function buildCommunicationEmailHtml(params: { title: string; body: string; preheader?: string | null }): string {
  const content = looksLikeHtml(params.body) ? params.body : textToHtml(params.body)
  const alreadyFullDocument = /<\s*html[\s>]/i.test(params.body) || /<\s*body[\s>]/i.test(params.body)
  return alreadyFullDocument ? params.body : communicationEmailShell(params.title, content, params.preheader ?? undefined)
}

export function starterCampaignHtml(): string {
  return `<h2 style="margin:0 0 14px;color:#00236f;font-size:22px;">Hi {{name}},</h2>
<p style="margin:0 0 16px;">We wanted to follow up and see if your business is still exploring funding options.</p>
<div style="background:#f8fafc;border:1px solid #d8dbe8;border-radius:14px;padding:18px;margin:20px 0;">
  <p style="margin:0 0 8px;font-weight:800;color:#006a61;">What MCA King can help with:</p>
  <ul style="margin:0;padding-left:20px;line-height:1.7;">
    <li>Fast review of your current funding needs</li>
    <li>Matching your file to appropriate funders</li>
    <li>Clear next steps for documents, offers, and renewals</li>
  </ul>
</div>
<p style="margin:0 0 20px;">Reply to this email if you would like us to review your options.</p>
<a href="mailto:{{email}}" style="display:inline-block;background:#006a61;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:800;">Contact Us</a>`
}
