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
  category: string
  severity: string
  pageOrEndpoint: string
  environment: string
  url: string
  feedback: string
  expected: string
  actual: string
  reproSteps: string
  allowContact: boolean
}

const INIT: FormState = {
  fullName: '',
  email: '',
  company: '',
  category: '',
  severity: '',
  pageOrEndpoint: '',
  environment: '',
  url: '',
  feedback: '',
  expected: '',
  actual: '',
  reproSteps: '',
  allowContact: true,
}

export default function FeedbackPage() {
  const [data, setData] = useState<FormState>({ ...INIT })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)

  const onFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setData((d) => ({ ...d, [name]: value }))
  }

  const onCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setData((d) => ({ ...d, [name]: checked }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/feedback', {
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
  const invalid = req(data.email) || req(data.category) || req(data.feedback)

  return (
    <ContentPage title="We Value Your Feedback">
      <p>
        Help us improve the Global.Church developer experience. Share bugs, feature ideas, documentation gaps, or anything that would make building with our API better. Detailed feedback helps us act quickly and prioritize the right improvements.
      </p>
      <div className="not-prose mt-10">
        {result?.ok ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-900 flex items-start gap-3">
            <CheckCircle2 className="size-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Thanks for the feedback!</h3>
              <p className="text-sm text-green-800 mt-1">We really appreciate it. Our team will review and follow up if we need more detail.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 gap-6">
            {/* Contact info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-gray-700">Full name</label>
                <Input id="fullName" name="fullName" value={data.fullName} onChange={onFieldChange} placeholder="Jane Doe" />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">Email<span className="text-red-500">*</span></label>
                <Input id="email" name="email" type="email" value={data.email} onChange={onFieldChange} aria-invalid={req(data.email)} placeholder="jane@yourorg.org" required />
              </div>
              <div>
                <label htmlFor="company" className="mb-2 block text-sm font-medium text-gray-700">Company / Organization</label>
                <Input id="company" name="company" value={data.company} onChange={onFieldChange} placeholder="Your Organization" />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <input id="allowContact" name="allowContact" type="checkbox" className="size-4 rounded border-gray-300" checked={data.allowContact} onChange={onCheckboxChange} />
                <label htmlFor="allowContact" className="text-sm text-gray-700">You may contact me with follow-up questions</label>
              </div>
            </div>

            {/* Feedback details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Category<span className="text-red-500">*</span></label>
                <Select value={data.category} onValueChange={(v) => setData((d) => ({ ...d, category: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                    <SelectItem value="data">Data Accuracy</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Severity</label>
                <Select value={data.severity} onValueChange={(v) => setData((d) => ({ ...d, severity: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="How severe is it?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="feedback" className="mb-2 block text-sm font-medium text-gray-700">Feedback / Description<span className="text-red-500">*</span></label>
                <Textarea id="feedback" name="feedback" value={data.feedback} onChange={onFieldChange} aria-invalid={req(data.feedback)} placeholder="Describe the issue or idea. Include context and impact." required />
              </div>
              <div>
                <label htmlFor="pageOrEndpoint" className="mb-2 block text-sm font-medium text-gray-700">Page or Endpoint</label>
                <Input id="pageOrEndpoint" name="pageOrEndpoint" value={data.pageOrEndpoint} onChange={onFieldChange} placeholder="e.g., /explorer or GET /churches" />
                <label htmlFor="environment" className="mb-2 block text-sm font-medium text-gray-700 mt-4">Environment</label>
                <Input id="environment" name="environment" value={data.environment} onChange={onFieldChange} placeholder="e.g., Chrome, macOS, Node 20" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="url" className="mb-2 block text-sm font-medium text-gray-700">URL</label>
                <Input id="url" name="url" value={data.url} onChange={onFieldChange} placeholder="Link to page, repo, or example" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="reproSteps" className="mb-2 block text-sm font-medium text-gray-700">Reproduction steps</label>
                <Textarea id="reproSteps" name="reproSteps" value={data.reproSteps} onChange={onFieldChange} placeholder="1) Go to … 2) Click … 3) See error …" />
              </div>
              <div>
                <label htmlFor="expected" className="mb-2 block text-sm font-medium text-gray-700">Expected</label>
                <Textarea id="expected" name="expected" value={data.expected} onChange={onFieldChange} placeholder="What you expected to happen" />
                <label htmlFor="actual" className="mb-2 block text-sm font-medium text-gray-700 mt-4">Actual</label>
                <Textarea id="actual" name="actual" value={data.actual} onChange={onFieldChange} placeholder="What actually happened" />
              </div>
            </div>

            {result?.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">{result.error}</div>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" size="lg" disabled={submitting || invalid}>
                {submitting ? (
                  <><Loader2 className="size-4 animate-spin" /> Submitting…</>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
              <span className="text-sm text-gray-500">Thank you for helping us improve.</span>
            </div>
          </form>
        )}
      </div>
    </ContentPage>
  )
}
