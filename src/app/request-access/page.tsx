"use client";

import { useState } from 'react'
import ContentPage from '@/components/ContentPage'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, Loader2 } from 'lucide-react'

type FormState = {
  fullName: string
  email: string
  company: string
  roleTitle: string
  website: string
  projectName: string
  useCase: string
  endpoints: string[]
  expectedVolume: string
  timeline: string
  regions: string
  teamSize: string
  country: string
  github: string
  heardFrom: string
  notes: string
  termsAccepted: boolean
}

const INIT: FormState = {
  fullName: '',
  email: '',
  company: '',
  roleTitle: '',
  website: '',
  projectName: '',
  useCase: '',
  endpoints: [],
  expectedVolume: '',
  timeline: '',
  regions: '',
  teamSize: '',
  country: '',
  github: '',
  heardFrom: '',
  notes: '',
  termsAccepted: false,
}

export default function RequestAccessPage() {
  const [data, setData] = useState<FormState>({ ...INIT })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target
    setData((d) => ({ ...d, [name]: type === 'checkbox' ? checked : value }))
  }

  const toggleEndpoint = (v: string) => {
    setData((d) => {
      const has = d.endpoints.includes(v)
      return { ...d, endpoints: has ? d.endpoints.filter((x) => x !== v) : [...d.endpoints, v] }
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        const parts: string[] = []
        const p = (payload ?? {}) as Record<string, unknown>
        if (typeof p.error === 'string') parts.push(p.error)
        if (typeof p.status === 'number') parts.push(`status ${p.status}`)
        if (p.detail) {
          const d = typeof p.detail === 'string' ? p.detail : JSON.stringify(p.detail)
          parts.push(d)
        }
        if (typeof p.hint === 'string') parts.push(`hint: ${p.hint}`)
        if (parts.length === 0) parts.push(`HTTP ${res.status}`)
        throw new Error(parts.join(' – ').slice(0, 2000))
      }
      setResult({ ok: true })
      setData({ ...INIT })
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  const req = (v: string) => v.trim().length === 0
  const invalid = req(data.fullName) || req(data.email) || req(data.company) || req(data.useCase) || !data.termsAccepted

  return (
    <ContentPage title="Request API Access">
      <p>
        To protect data integrity, security, and fair use, access to the Global.Church API is provisioned by request. Tell us about your organization and intended use, and our team will review your application and issue credentials aligned to your needs.
      </p>
      <div className="not-prose mt-10">
        {result?.ok ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-900 flex items-start gap-3">
            <CheckCircle2 className="size-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Request submitted</h3>
              <p className="text-sm text-green-800 mt-1">Thanks for reaching out. We’ll review your details and contact you shortly with next steps.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 gap-6">
            {/* Contact and org info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-gray-700">Full name<span className="text-red-500">*</span></label>
                <Input id="fullName" name="fullName" value={data.fullName} onChange={onChange} aria-invalid={req(data.fullName)} placeholder="Jane Doe" required />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">Work email<span className="text-red-500">*</span></label>
                <Input id="email" name="email" type="email" value={data.email} onChange={onChange} aria-invalid={req(data.email)} placeholder="jane@yourorg.org" required />
              </div>
              <div>
                <label htmlFor="company" className="mb-2 block text-sm font-medium text-gray-700">Company / Organization<span className="text-red-500">*</span></label>
                <Input id="company" name="company" value={data.company} onChange={onChange} aria-invalid={req(data.company)} placeholder="Your Organization" required />
              </div>
              <div>
                <label htmlFor="roleTitle" className="mb-2 block text-sm font-medium text-gray-700">Role / Title</label>
                <Input id="roleTitle" name="roleTitle" value={data.roleTitle} onChange={onChange} placeholder="Developer, PM, etc." />
              </div>
              <div>
                <label htmlFor="website" className="mb-2 block text-sm font-medium text-gray-700">Website</label>
                <Input id="website" name="website" value={data.website} onChange={onChange} placeholder="https://example.org" />
              </div>
              <div>
                <label htmlFor="country" className="mb-2 block text-sm font-medium text-gray-700">Country</label>
                <Input id="country" name="country" value={data.country} onChange={onChange} placeholder="United States" />
              </div>
            </div>

            {/* Project details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="projectName" className="mb-2 block text-sm font-medium text-gray-700">Project name</label>
                <Input id="projectName" name="projectName" value={data.projectName} onChange={onChange} placeholder="App or initiative name" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Timeline</label>
                <Select value={data.timeline} onValueChange={(v) => setData((d) => ({ ...d, timeline: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select timeline" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="1-3 months">1–3 months</SelectItem>
                    <SelectItem value="3-6 months">3–6 months</SelectItem>
                    <SelectItem value="6+ months">6+ months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label htmlFor="useCase" className="mb-2 block text-sm font-medium text-gray-700">Use case / project description<span className="text-red-500">*</span></label>
              <Textarea id="useCase" name="useCase" value={data.useCase} onChange={onChange} aria-invalid={req(data.useCase)} placeholder="Describe what you’re building, who it serves, and how you plan to use the API." required />
            </div>

            {/* Endpoints & usage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <fieldset>
                  <legend className="mb-2 block text-sm font-medium text-gray-700">Endpoints needed</legend>
                  <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                    {['Church search', 'Church details', 'Geospatial (nearby/within)', 'Bulk export', 'Other'].map((label) => (
                      <label key={label} className="flex items-center gap-3">
                        <input type="checkbox" className="size-4 rounded border-gray-300" checked={data.endpoints.includes(label)} onChange={() => toggleEndpoint(label)} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Expected usage volume</label>
                  <Select value={data.expectedVolume} onValueChange={(v) => setData((d) => ({ ...d, expectedVolume: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Average requests/day" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="< 1k">Less than 1,000</SelectItem>
                      <SelectItem value="1k–10k">1,000–10,000</SelectItem>
                      <SelectItem value="> 10k">More than 10,000</SelectItem>
                      <SelectItem value="unknown">Not sure yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="regions" className="mb-2 block text-sm font-medium text-gray-700">Regions of interest</label>
                  <Input id="regions" name="regions" value={data.regions} onChange={onChange} placeholder="e.g., North America, Europe, Sub-Saharan Africa" />
                </div>
              </div>
            </div>

            {/* Extra */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="teamSize" className="mb-2 block text-sm font-medium text-gray-700">Team size</label>
                <Input id="teamSize" name="teamSize" value={data.teamSize} onChange={onChange} placeholder="e.g., 1–5" />
              </div>
              <div>
                <label htmlFor="github" className="mb-2 block text-sm font-medium text-gray-700">GitHub (optional)</label>
                <Input id="github" name="github" value={data.github} onChange={onChange} placeholder="https://github.com/your-org" />
              </div>
              <div>
                <label htmlFor="heardFrom" className="mb-2 block text-sm font-medium text-gray-700">How did you hear about us?</label>
                <Input id="heardFrom" name="heardFrom" value={data.heardFrom} onChange={onChange} placeholder="Referral, FaithTech, search, etc." />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="mb-2 block text-sm font-medium text-gray-700">Anything else we should know?</label>
              <Textarea id="notes" name="notes" value={data.notes} onChange={onChange} placeholder="Additional context, constraints, or questions." />
            </div>

            <div className="flex items-start gap-3">
              <input
                id="termsAccepted"
                name="termsAccepted"
                type="checkbox"
                className="mt-1 size-4 rounded border-gray-300"
                checked={data.termsAccepted}
                onChange={onChange}
              />
              <label htmlFor="termsAccepted" className="text-sm text-gray-700">
                I agree to responsible use of the API and understand that access may be adjusted to protect platform stability and data quality. <span className="text-red-500">*</span>
              </label>
            </div>

            {result?.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">{result.error}</div>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" size="lg" disabled={submitting || invalid}>
                {submitting ? (
                  <><Loader2 className="size-4 animate-spin" /> Submitting…</>
                ) : (
                  'Submit Request'
                )}
              </Button>
              <span className="text-sm text-gray-500">We’ll reply by email within a few business days.</span>
            </div>
          </form>
        )}
      </div>
    </ContentPage>
  )
}
