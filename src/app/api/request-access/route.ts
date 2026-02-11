import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { emailLimiter, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'

type RequestBody = {
  fullName?: unknown
  email?: unknown
  company?: unknown
  roleTitle?: unknown
  website?: unknown
  projectName?: unknown
  useCase?: unknown
  endpoints?: unknown
  expectedVolume?: unknown
  timeline?: unknown
  regions?: unknown
  teamSize?: unknown
  country?: unknown
  github?: unknown
  heardFrom?: unknown
  notes?: unknown
  termsAccepted?: unknown
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function sanitize(s: string): string {
  return s.replace(/[\u0000-\u001F\u007F<>]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : ' ',
  )
}

function fmt(k: string, v: string | undefined) {
  return v ? `<tr><td style="padding:6px 10px;color:#64748b;white-space:nowrap">${k}</td><td style="padding:6px 10px;color:#0f172a">${sanitize(v)}</td></tr>` : ''
}

function asText(obj: Record<string, string | undefined>): string {
  return Object.entries(obj)
    .filter(([, v]) => isNonEmptyString(v))
    .map(([k, v]) => `${k}: ${v}`)
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
    const roleTitle = isNonEmptyString(body.roleTitle) ? body.roleTitle.trim() : ''
    const website = isNonEmptyString(body.website) ? body.website.trim() : ''
    const projectName = isNonEmptyString(body.projectName) ? body.projectName.trim() : ''
    const useCase = isNonEmptyString(body.useCase) ? body.useCase.trim() : ''
    const endpoints = Array.isArray(body.endpoints)
      ? (body.endpoints as unknown[]).map((x) => String(x)).filter(Boolean).join(', ')
      : isNonEmptyString(body.endpoints) ? body.endpoints : ''
    const expectedVolume = isNonEmptyString(body.expectedVolume) ? body.expectedVolume.trim() : ''
    const timeline = isNonEmptyString(body.timeline) ? body.timeline.trim() : ''
    const regions = isNonEmptyString(body.regions) ? body.regions.trim() : ''
    const teamSize = isNonEmptyString(body.teamSize) ? body.teamSize.trim() : ''
    const country = isNonEmptyString(body.country) ? body.country.trim() : ''
    const github = isNonEmptyString(body.github) ? body.github.trim() : ''
    const heardFrom = isNonEmptyString(body.heardFrom) ? body.heardFrom.trim() : ''
    const notes = isNonEmptyString(body.notes) ? body.notes.trim() : ''
    const termsAccepted = body.termsAccepted === true || body.termsAccepted === 'true'

    if (!fullName || !email || !company || !useCase || !termsAccepted) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 },
      )
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const TO_RAW = process.env.REQUEST_ACCESS_RECIPIENT || 'trent.sikute@global.church'
    const TO = TO_RAW.split(',').map(email => email.trim()).filter(email => email.length > 0)
    const FROM = process.env.EMAIL_FROM || 'Global Church <no-reply@global.church>'

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured.' },
        { status: 500 },
      )
    }

    const subject = `New API Access Request – ${fullName}${company ? ' (' + company + ')' : ''}`

    const fields: Record<string, string | undefined> = {
      'Full Name': fullName,
      'Email': email,
      'Company/Organization': company,
      'Role/Title': roleTitle,
      'Website': website,
      'Project Name': projectName,
      'Use Case / Project Description': useCase,
      'Endpoints Needed': endpoints,
      'Expected Usage Volume': expectedVolume,
      'Timeline': timeline,
      'Regions of Interest': regions,
      'Team Size': teamSize,
      'Country': country,
      'GitHub': github,
      'Heard About Us': heardFrom,
      'Additional Notes': notes,
    }

    const html = `
      <div style="font-family:Inter,system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:720px">
        <h2 style="margin:0 0 8px 0;color:#0f172a">API Access Request</h2>
        <p style="margin:0 0 16px 0;color:#475569">A new request was submitted via the website.</p>
        <table style="border-collapse:collapse;width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <tbody>
            ${fmt('Full Name', fullName)}
            ${fmt('Email', email)}
            ${fmt('Company/Organization', company)}
            ${fmt('Role/Title', roleTitle)}
            ${fmt('Website', website)}
            ${fmt('Project Name', projectName)}
            ${fmt('Use Case / Project Description', useCase)}
            ${fmt('Endpoints Needed', endpoints)}
            ${fmt('Expected Usage Volume', expectedVolume)}
            ${fmt('Timeline', timeline)}
            ${fmt('Regions of Interest', regions)}
            ${fmt('Team Size', teamSize)}
            ${fmt('Country', country)}
            ${fmt('GitHub', github)}
            ${fmt('Heard About Us', heardFrom)}
            ${fmt('Additional Notes', notes)}
          </tbody>
        </table>
      </div>
    `
    const text = asText(fields)

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
      console.error('Resend error (request-access)', {
        status: res.status,
        statusText: res.statusText,
        body: raw?.slice(0, 2000),
      })
      return NextResponse.json(
        { error: 'Failed to submit request.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('request-access error', err)
    return NextResponse.json(
      { error: 'Unexpected error.' },
      { status: 500 },
    )
  }
}
