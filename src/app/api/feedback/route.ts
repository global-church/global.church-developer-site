import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { emailLimiter, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'

type RequestBody = {
  fullName?: unknown
  email?: unknown
  company?: unknown
  category?: unknown
  severity?: unknown
  pageOrEndpoint?: unknown
  environment?: unknown
  url?: unknown
  feedback?: unknown
  expected?: unknown
  actual?: unknown
  reproSteps?: unknown
  allowContact?: unknown
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function sanitize(s: string): string {
  return s.replace(/[\u0000-\u001F\u007F<>]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : ' ',
  )
}

const EMPTY = '—'

function fmtAll(k: string, v: string | undefined) {
  const show = isNonEmptyString(v) ? v : EMPTY
  return `<tr><td style="padding:6px 10px;color:#64748b;white-space:nowrap">${k}</td><td style="padding:6px 10px;color:#0f172a">${sanitize(show)}</td></tr>`
}

function asTextAll(obj: Record<string, string | undefined>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${isNonEmptyString(v) ? v : EMPTY}`)
    .join('\n')
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { limited } = emailLimiter.check(ip)
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    const body = (await req.json()) as RequestBody
    const fullName = isNonEmptyString(body.fullName) ? body.fullName.trim() : ''
    const email = isNonEmptyString(body.email) ? body.email.trim() : ''
    const company = isNonEmptyString(body.company) ? body.company.trim() : ''
    const category = isNonEmptyString(body.category) ? body.category.trim() : ''
    const severity = isNonEmptyString(body.severity) ? body.severity.trim() : ''
    const pageOrEndpoint = isNonEmptyString(body.pageOrEndpoint) ? body.pageOrEndpoint.trim() : ''
    const environment = isNonEmptyString(body.environment) ? body.environment.trim() : ''
    const url = isNonEmptyString(body.url) ? body.url.trim() : ''
    const feedback = isNonEmptyString(body.feedback) ? body.feedback.trim() : ''
    const expected = isNonEmptyString(body.expected) ? body.expected.trim() : ''
    const actual = isNonEmptyString(body.actual) ? body.actual.trim() : ''
    const reproSteps = isNonEmptyString(body.reproSteps) ? body.reproSteps.trim() : ''
    const allowContact = body.allowContact === true || body.allowContact === 'true'

    if (!email || !category || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields (email, category, feedback).' },
        { status: 400 },
      )
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const TO_RAW = process.env.FEEDBACK_RECIPIENT || process.env.REQUEST_ACCESS_RECIPIENT || 'trent.sikute@global.church'
    const TO = TO_RAW.split(',').map(email => email.trim()).filter(email => email.length > 0)
    const FROM = process.env.EMAIL_FROM || 'Global Church <no-reply@global.church>'

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured.' },
        { status: 500 },
      )
    }

    const subject = `Developer Feedback – ${category}${fullName ? ' from ' + fullName : ''}`

    const contactPermission = allowContact ? 'Yes' : 'No'

    const fields: Record<string, string | undefined> = {
      'Full Name': fullName,
      'Email': email,
      'Company/Organization': company,
      'Category': category,
      'Severity': severity,
      'Page or Endpoint': pageOrEndpoint,
      'Environment': environment,
      'URL': url,
      'Feedback / Description': feedback,
      'Expected': expected,
      'Actual': actual,
      'Reproduction Steps': reproSteps,
      'You may contact me with follow-up questions': contactPermission,
    }

    const html = `
      <div style="font-family:Inter,system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:720px">
        <h2 style="margin:0 0 8px 0;color:#0f172a">Developer Feedback</h2>
        <p style="margin:0 8px 16px 0;color:#475569">A new feedback entry was submitted via the developer site.</p>
        <p style="margin:0 0 16px 0;color:#0f172a"><strong>Contact Permission:</strong> ${contactPermission}</p>
        <table style="border-collapse:collapse;width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <tbody>
            ${fmtAll('Full Name', fullName)}
            ${fmtAll('Email', email)}
            ${fmtAll('Company/Organization', company)}
            ${fmtAll('Category', category)}
            ${fmtAll('Severity', severity)}
            ${fmtAll('Page or Endpoint', pageOrEndpoint)}
            ${fmtAll('Environment', environment)}
            ${fmtAll('URL', url)}
            ${fmtAll('Feedback / Description', feedback)}
            ${fmtAll('Expected', expected)}
            ${fmtAll('Actual', actual)}
            ${fmtAll('Reproduction Steps', reproSteps)}
            ${fmtAll('You may contact me with follow-up questions', contactPermission)}
          </tbody>
        </table>
      </div>
    `
    const text = `Contact Permission: ${contactPermission}\n` + asTextAll(fields)

    // Basic diagnostics (do not log secrets)
    const diag = {
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
      hasEmailFrom: Boolean(process.env.EMAIL_FROM),
      region: process.env.VERCEL_REGION ?? null,
      runtime: process.version,
    }
    console.log('[feedback] attempting send', { subject, to: TO, from: FROM, diag })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: TO,
        subject,
        html,
        text,
        reply_to: email,
      }),
    })

    if (!res.ok) {
      const raw = await res.text()
      console.error('Resend error (feedback)', {
        status: res.status,
        statusText: res.statusText,
        body: raw?.slice(0, 2000),
      })
      return NextResponse.json(
        { error: 'Failed to send feedback.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('feedback route error', {
      error:
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : { message: String(err) },
    })

    return NextResponse.json(
      { error: 'Unexpected error.' },
      { status: 500 },
    )
  }
}
