'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { createChurch, saveChurchChanges } from '@/app/admin/actions';
import type { ChurchPublic } from '@/lib/types';

type Props = {
  church: ChurchPublic | null;
  mode?: 'idle' | 'edit' | 'create';
  initialValues?: Partial<ChurchPublic>;
  loading: boolean;
  onClose: () => void;
  onSaved: (church: ChurchPublic, mode: 'edit' | 'create') => void;
  onError: (message: string) => void;
  visibleFieldKeys?: Array<keyof ChurchPublic>;
};

type FieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'number'
  | 'boolean'
  | 'select'
  | 'stringArray'
  | 'numberArray'
  | 'json'
  | 'serviceTimes';

type FieldConfig = {
  key: keyof ChurchPublic;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  readOnly?: boolean;
  options?: Array<{ label: string; value: string }>;
  requiresAttention?: boolean;
  attentionValues?: string[];
};

type FieldSection = {
  title: string;
  fields: FieldConfig[];
};

type DraftMap = Record<string, string>;

type ParseResult = {
  value: unknown;
  error?: string;
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MINUTES_IN_DAY = 60 * 24;
const MINUTES_IN_WEEK = MINUTES_IN_DAY * 7;

type ServiceTimeEntry = {
  id: string;
  day: number;
  minutes: number;
};

function normaliseWeeklyMinutes(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const mod = ((Math.floor(value) % MINUTES_IN_WEEK) + MINUTES_IN_WEEK) % MINUTES_IN_WEEK;
  return mod;
}

function parseServiceTimesValue(raw: string): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  } catch {
    return [];
  }
}

function numbersToEntries(numbers: number[]): ServiceTimeEntry[] {
  return numbers.map((value, index) => {
    const normalized = normaliseWeeklyMinutes(value);
    const day = Math.floor(normalized / MINUTES_IN_DAY) % DAY_LABELS.length;
    const minutes = day * MINUTES_IN_DAY + (normalized % MINUTES_IN_DAY);
    return {
      id: `${day}-${minutes}-${index}`,
      day,
      minutes,
    };
  });
}

function toTimeValue(minutes: number): string {
  const minutesOfDay = minutes % MINUTES_IN_DAY;
  const hours = Math.floor(minutesOfDay / 60);
  const mins = minutesOfDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function parseTimeInput(value: string): number | null {
  if (!value) return null;
  const [hoursStr, minutesStr] = value.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatServiceTimeLabel(entry: ServiceTimeEntry): string {
  const dayLabel = DAY_LABELS[entry.day] ?? 'Sunday';
  const minutesOfDay = entry.minutes % MINUTES_IN_DAY;
  let hours = Math.floor(minutesOfDay / 60);
  const mins = minutesOfDay % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minsLabel = String(mins).padStart(2, '0');
  return `${dayLabel} ${hours}:${minsLabel} ${period}`;
}

type ServiceTimesEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  requiresAttention?: boolean;
};

function ServiceTimesEditor({ value, onChange, requiresAttention }: ServiceTimesEditorProps) {
  const [rows, setRows] = useState<ServiceTimeEntry[]>(() => numbersToEntries(parseServiceTimesValue(value)));
  const [newDay, setNewDay] = useState<number | ''>('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    setRows(numbersToEntries(parseServiceTimesValue(value)));
  }, [value]);

  const highlight = requiresAttention && rows.length === 0;

  const applyRows = useCallback(
    (nextRows: ServiceTimeEntry[]) => {
      const sorted = [...nextRows].sort((a, b) => a.minutes - b.minutes);
      setRows(sorted);
      if (sorted.length === 0) {
        onChange('[]');
      } else {
        onChange(JSON.stringify(sorted.map((entry) => entry.minutes)));
      }
    },
    [onChange],
  );

  const handleRemove = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    applyRows(next);
  };

  const handleDayChange = (index: number, day: number) => {
    const minutesOfDay = rows[index].minutes % MINUTES_IN_DAY;
    const minutes = day * MINUTES_IN_DAY + minutesOfDay;
    const next = rows.map((row, i) => (i === index ? { ...row, day, minutes } : row));
    applyRows(next);
  };

  const handleTimeChange = (index: number, timeValue: string) => {
    const minutesOfDay = parseTimeInput(timeValue);
    if (minutesOfDay == null) return;
    const day = rows[index].day;
    const minutes = day * MINUTES_IN_DAY + minutesOfDay;
    const next = rows.map((row, i) => (i === index ? { ...row, minutes } : row));
    applyRows(next);
  };

  const handleAdd = () => {
    if (newDay === '') return;
    const minutesOfDay = parseTimeInput(newTime);
    if (minutesOfDay == null) return;
    const minutes = newDay * MINUTES_IN_DAY + minutesOfDay;
    const entry: ServiceTimeEntry = {
      id: `${newDay}-${minutes}-${Date.now()}`,
      day: newDay,
      minutes,
    };
    applyRows([...rows, entry]);
    setNewDay('');
    setNewTime('');
  };

  const canAdd = newDay !== '' && parseTimeInput(newTime) != null;

  return (
    <div
      className={`space-y-3 rounded-md border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-100 ${
        highlight ? 'border-white/80 ring-1 ring-white/70' : ''
      }`}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No service times yet. Add a day and time below.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((entry, index) => (
            <div key={entry.id} className="flex flex-wrap items-center gap-3">
              <select
                value={entry.day}
                onChange={(event) => handleDayChange(index, Number(event.target.value))}
                className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                {DAY_LABELS.map((label, dayIndex) => (
                  <option key={label} value={dayIndex}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={toTimeValue(entry.minutes)}
                onChange={(event) => handleTimeChange(index, event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <span className="text-xs text-slate-400">{formatServiceTimeLabel(entry)}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="ml-auto rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-rose-500 hover:text-rose-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3">
        <select
          value={newDay}
          onChange={(event) => {
            const nextValue = event.target.value;
            setNewDay(nextValue === '' ? '' : Number(nextValue));
          }}
          className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          <option value="">Select day</option>
          {DAY_LABELS.map((label, dayIndex) => (
            <option key={label} value={dayIndex}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={newTime}
          onChange={(event) => setNewTime(event.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Add service
        </button>
      </div>
    </div>
  );
}

const FIELD_SECTIONS: FieldSection[] = [
  {
    title: 'Core Details',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, requiresAttention: true },
      {
        key: 'admin_status',
        label: 'Admin Status',
        type: 'select',
        options: [
          { label: 'Approved', value: 'approved' },
          { label: 'Needs Review', value: 'needs_review' },
          { label: 'Rejected', value: 'rejected' },
        ],
        requiresAttention: true,
        attentionValues: ['needs_review'],
      },
      {
        key: 'admin_notes',
        label: 'Admin Notes',
        type: 'textarea',
        description: 'Private notes only visible within the admin dashboard.',
      },
      {
        key: 'belief_type',
        label: 'Belief Type',
        type: 'select',
        options: [
          { label: 'Roman Catholic', value: 'roman_catholic' },
          { label: 'Orthodox', value: 'orthodox' },
          { label: 'Protestant', value: 'protestant' },
          { label: 'Anglican', value: 'anglican' },
          { label: 'Other', value: 'other' },
          { label: 'Unknown', value: 'unknown' },
        ],
        requiresAttention: true,
      },
      { key: 'denomination', label: 'Denomination', type: 'text', requiresAttention: true },
      { key: 'trinitarian', label: 'Trinitarian (verified)', type: 'boolean', requiresAttention: true },
      { key: 'church_summary', label: 'Summary', type: 'textarea', requiresAttention: true },
      { key: 'services_info', label: 'Services Info', type: 'textarea', requiresAttention: true },
    ],
  },
  {
    title: 'Graphics',
    fields: [
      { key: 'logo_url', label: 'Logo URL', type: 'url', placeholder: 'https://example.com/logo.png' },
      { key: 'logo_width', label: 'Logo Width (pixels)', type: 'number' },
      { key: 'logo_height', label: 'Logo Height (pixels)', type: 'number' },
      { key: 'logo_aspect_ratio', label: 'Logo Aspect Ratio', type: 'number' },
      { key: 'banner_url', label: 'Banner URL', type: 'url' },
      { key: 'banner_width', label: 'Banner Width (pixels)', type: 'number' },
      { key: 'banner_height', label: 'Banner Height (pixels)', type: 'number' },
      { key: 'banner_aspect_ratio', label: 'Banner Aspect Ratio', type: 'number' },
    ],
  },
  {
    title: 'Location',
    fields: [
      { key: 'address', label: 'Street Address', type: 'textarea', requiresAttention: true },
      { key: 'locality', label: 'Locality / City', type: 'text', requiresAttention: true },
      { key: 'region', label: 'Region / State', type: 'text', requiresAttention: true },
      { key: 'postal_code', label: 'Postal Code', type: 'text', requiresAttention: true },
      { key: 'country', label: 'Country', type: 'text', required: true, requiresAttention: true },
      { key: 'latitude', label: 'Latitude', type: 'number', requiresAttention: true },
      { key: 'longitude', label: 'Longitude', type: 'number', requiresAttention: true },
    ],
  },
  {
    title: 'Web & Media',
    fields: [
      { key: 'website', label: 'Website', type: 'url', placeholder: 'https://example.com', requiresAttention: true },
      { key: 'url_beliefs', label: 'Beliefs URL', type: 'url' },
      { key: 'url_giving', label: 'Giving URL', type: 'url' },
      { key: 'url_live', label: 'Live Stream URL', type: 'url' },
      { key: 'url_campus', label: 'Campus URL', type: 'url' },
      { key: 'url_facebook', label: 'Facebook URL', type: 'url' },
      { key: 'url_instagram', label: 'Instagram URL', type: 'url' },
      { key: 'url_tiktok', label: 'TikTok URL', type: 'url' },
      { key: 'youtube_url', label: 'YouTube URL', type: 'url' },
      { key: 'social_media', label: 'Social Media (one per line)', type: 'stringArray' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'scraped_email', label: 'Primary Email', type: 'text', requiresAttention: true },
      { key: 'contact_emails', label: 'Contact Emails', type: 'stringArray' },
      { key: 'church_phone', label: 'Church Phone', type: 'text', requiresAttention: true },
      { key: 'contact_phones', label: 'Contact Phones', type: 'stringArray' },
      { key: 'programs_offered', label: 'Programs Offered', type: 'stringArray' },
      { key: 'ministry_names', label: 'Ministry Names', type: 'stringArray' },
      { key: 'ministries_json', label: 'Ministries JSON', type: 'json', description: 'Provide valid JSON describing ministries.' },
    ],
  },
  {
    title: 'Services',
    fields: [
      { key: 'service_languages', label: 'Service Languages', type: 'stringArray', description: 'Separate languages with new lines or commas.' },
      { key: 'service_times', label: 'Service Times', type: 'serviceTimes', description: 'Add services by day and time.', requiresAttention: true },
      { key: 'service_source_urls', label: 'Service Source URLs', type: 'stringArray' },
    ],
  },
  {
    title: 'Campus & Meta',
    fields: [
      { key: 'campus_name', label: 'Campus Name', type: 'text' },
      { key: 'overarching_name', label: 'Overarching Name', type: 'text' },
      { key: 'is_multi_campus', label: 'Multi-Campus', type: 'boolean' },
    ],
  },
];

const ALL_FIELD_CONFIGS = FIELD_SECTIONS.flatMap((section) => section.fields);

function stringifyField(config: FieldConfig, value: unknown): string {
  if (value == null) return '';

  switch (config.type) {
    case 'boolean':
      if (value === true) return 'true';
      if (value === false) return 'false';
      return 'unknown';
    case 'stringArray':
      return Array.isArray(value) ? value.join('\n') : '';
    case 'numberArray':
      return Array.isArray(value) ? value.join('\n') : '';
    case 'json':
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    case 'serviceTimes':
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }
      return typeof value === 'string' ? value : '';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

function mapChurchToDraft(church: Partial<ChurchPublic>): DraftMap {
  const next: DraftMap = {};
  for (const field of ALL_FIELD_CONFIGS) {
    const raw = (church as Record<string, unknown>)[field.key as string];
    next[field.key as string] = stringifyField(field, raw);
  }
  return next;
}

function parseFieldValue(config: FieldConfig, raw: string): ParseResult {
  switch (config.type) {
    case 'boolean': {
      if (raw === 'true') return { value: true };
      if (raw === 'false') return { value: false };
      return { value: null };
    }
    case 'number': {
      const trimmed = raw.trim();
      if (!trimmed.length) return { value: null };
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return { value: null, error: 'Enter a valid number.' };
      }
      return { value: parsed };
    }
    case 'url':
    case 'text': {
      const trimmed = raw.trim();
      if (!trimmed.length) return { value: null };
      if (config.type === 'url') {
        const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
        try {
          // We only validate format; we return the original trimmed value to avoid rewriting URLs.
          new URL(candidate);
        } catch {
          return { value: null, error: 'Enter a valid URL (e.g. https://example.com).' };
        }
      }
      return { value: trimmed };
    }
    case 'textarea': {
      const trimmed = raw.trim();
      if (!trimmed.length) return { value: null };
      return { value: raw };
    }
    case 'stringArray': {
      const tokens = raw
        .split(/[,\n]/)
        .map((part) => part.trim())
        .filter(Boolean);
      return { value: tokens.length ? tokens : null };
    }
    case 'numberArray': {
      const tokens = raw
        .split(/[,\n]/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (!tokens.length) {
        return { value: null };
      }
      const numbers = tokens.map((token) => Number(token));
      if (numbers.some((value) => !Number.isFinite(value))) {
        return { value: null, error: 'All entries must be numeric.' };
      }
      return { value: numbers };
    }
    case 'json': {
      const trimmed = raw.trim();
      if (!trimmed.length) return { value: null };
      try {
        return { value: JSON.parse(trimmed) };
      } catch {
        return { value: null, error: 'Invalid JSON structure.' };
      }
    }
    case 'serviceTimes': {
      const trimmed = raw.trim();
      if (!trimmed.length || trimmed === '[]') {
        return { value: null };
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          return { value: null, error: 'Service times format is invalid.' };
        }
        const numbers = parsed.filter((item) => Number.isFinite(item)).map((item) => Math.round(Number(item)));
        return { value: numbers.length ? numbers : null };
      } catch {
        return { value: null, error: 'Service times format is invalid.' };
      }
    }
    default:
      return { value: raw };
  }
}

function buildUpdates(
  draft: DraftMap,
  initial: DraftMap,
): { updates: Partial<ChurchPublic>; errors: Record<string, string> } {
  const updates: Partial<ChurchPublic> = {};
  const errors: Record<string, string> = {};

  for (const field of ALL_FIELD_CONFIGS) {
    if (field.readOnly) {
      continue;
    }
    const key = field.key as string;
    const currentValue = draft[key] ?? '';
    const baseline = initial[key] ?? '';
    if (currentValue === baseline) {
      continue;
    }

    const { value, error } = parseFieldValue(field, currentValue);
    if (error) {
      errors[key] = error;
      continue;
    }

    if (field.required) {
      const isUnset =
        value == null ||
        (typeof value === 'string' && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0);
      if (isUnset) {
        errors[key] = 'This field is required.';
        continue;
      }
    }

    (updates as Record<string, unknown>)[key] = value;
  }

  return { updates, errors };
}

export function ChurchEditor({
  church,
  mode = 'idle',
  initialValues,
  loading,
  onClose,
  onSaved,
  onError,
  visibleFieldKeys,
}: Props) {
  const [draft, setDraft] = useState<DraftMap>({});
  const [initialDraft, setInitialDraft] = useState<DraftMap>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allowedKeys = useMemo(() => {
    if (!visibleFieldKeys || visibleFieldKeys.length === 0) return null;
    return new Set<keyof ChurchPublic>(visibleFieldKeys);
  }, [visibleFieldKeys]);

  const sectionsToRender = useMemo(() => {
    if (!allowedKeys) return FIELD_SECTIONS;
    const filtered: FieldSection[] = [];
    for (const section of FIELD_SECTIONS) {
      const fields = section.fields.filter((field) => allowedKeys.has(field.key));
      if (fields.length === 0) continue;
      filtered.push({ ...section, fields });
    }
    return filtered;
  }, [allowedKeys]);

  useEffect(() => {
    if (mode === 'create') {
      const mapped = mapChurchToDraft(initialValues ?? {});
      setDraft(mapped);
      setInitialDraft(mapped);
      setValidationErrors({});
      setFormError(null);
      return;
    }

    if (!church) {
      setDraft({});
      setInitialDraft({});
      setValidationErrors({});
      setFormError(null);
      return;
    }

    const mapped = mapChurchToDraft(church);
    setDraft(mapped);
    setInitialDraft(mapped);
    setValidationErrors({});
    setFormError(null);
  }, [church, initialValues, mode]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(initialDraft);
  }, [draft, initialDraft]);

  const logoPreviewUrl = (draft.logo_url ?? '').trim();
  const hasLogoPreview = logoPreviewUrl.length > 0;

  if (loading) {
    return (
      <aside className="rounded-lg border border-slate-800 bg-slate-900/70 p-6 text-slate-300">
        Loading church details…
      </aside>
    );
  }

  if (mode !== 'create' && !church) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-6 text-sm text-slate-400">
        Select a church from the table to start editing.
      </aside>
    );
  }

  const renderField = (config: FieldConfig) => {
    const key = config.key as string;
    const value = draft[key] ?? '';

    const baseInputClass = 'rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40';
    const trimmed = typeof value === 'string' ? value.trim() : '';
    let isEmpty = trimmed.length === 0;
    if (config.type === 'boolean') {
      isEmpty = value === '' || value === 'unknown';
    }
    if (config.type === 'select') {
      isEmpty = trimmed.length === 0;
    }
    if (config.type === 'serviceTimes') {
      isEmpty = value === '' || value === '[]';
    }
    const matchesAttentionValue = config.attentionValues?.includes(trimmed) ?? false;
    const needsAttention = config.requiresAttention && (isEmpty || matchesAttentionValue);
    const attentionClass = needsAttention ? ' border-white/80 ring-1 ring-white/70' : '';
    const computedClass = `${baseInputClass}${config.readOnly ? ' cursor-not-allowed opacity-60 focus:ring-0' : ''}${attentionClass}`;

    const onChange = (nextValue: string) => {
      setDraft((prev) => ({ ...prev, [key]: nextValue }));
      setValidationErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setFormError(null);
    };

    const commonProps = config.readOnly ? { readOnly: true, disabled: true } : {};

    switch (config.type) {
      case 'textarea':
      case 'stringArray':
      case 'numberArray':
      case 'json':
        return (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={config.placeholder}
            rows={config.type === 'textarea' ? 3 : 4}
            className={`${computedClass} min-h-[96px] resize-y`}
            {...commonProps}
          />
        );
      case 'boolean':
        return (
          <select
            value={value || 'unknown'}
            onChange={(event) => onChange(event.target.value)}
            className={`${computedClass} pr-8`}
            {...commonProps}
          >
            <option value="unknown">Unknown</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={`${computedClass} pr-8`}
            {...commonProps}
          >
            <option value="">Select an option</option>
            {(config.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'serviceTimes':
        return (
          <ServiceTimesEditor
            value={value}
            onChange={onChange}
            requiresAttention={config.requiresAttention}
          />
        );
      case 'number':
        return (
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={config.placeholder}
            className={computedClass}
            {...commonProps}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={config.placeholder}
            className={computedClass}
            {...commonProps}
          />
        );
    }
  };

  const handleCancel = () => {
    setDraft({ ...initialDraft });
    setValidationErrors({});
    setFormError(null);
  };

  const handleSave = () => {
    const { updates, errors } = buildUpdates(draft, initialDraft);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      onError('Please resolve the highlighted validation errors.');
      return;
    }

    if (Object.keys(updates).length === 0) {
      onError(mode === 'create' ? 'Please provide details for the new church.' : 'No changes detected.');
      return;
    }

    const confirmationMessage =
      mode === 'create'
        ? 'Create this church record?'
        : 'Overwrite the existing data for this church? This action cannot be undone.';

    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = mode === 'create'
        ? await createChurch({ values: updates })
        : church
          ? await saveChurchChanges({ churchId: church.church_id, updates })
          : { success: false, error: 'No church selected.' };
      if (!result.success || !result.data) {
        const message = result.error ?? 'Update failed.';
        setFormError(message);
        onError(message);
        return;
      }

      const refreshed = mapChurchToDraft(result.data);
      setDraft(refreshed);
      setInitialDraft(refreshed);
      setValidationErrors({});
      setFormError(null);
      onSaved(result.data, mode === 'create' ? 'create' : 'edit');
    });
  };

  const headingName = mode === 'create'
    ? (draft.name?.trim() || 'New church')
    : church?.name ?? 'Church details';

  const churchId = mode === 'create' ? null : church?.church_id ?? null;

  return (
    <aside className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/70 p-6 text-slate-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-slate-800 bg-slate-950/60">
            {hasLogoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreviewUrl} alt={`${headingName} logo`} className="h-full w-full object-contain" />
            ) : (
              <span className="px-2 text-center text-xs text-slate-500">Logo preview unavailable</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{headingName}</h2>
            {churchId && <p className="text-sm text-slate-400">Church ID: {churchId}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!hasChanges || pending}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel changes
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !hasChanges}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {pending ? 'Saving…' : mode === 'create' ? 'Create church' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>

      {formError && (
        <div className="rounded-md border border-rose-600/60 bg-rose-900/40 px-4 py-3 text-sm text-rose-100">
          {formError}
        </div>
      )}

      <div className="space-y-8">
        {sectionsToRender.map((section) => (
          <section key={section.title} className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{section.title}</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {section.fields.map((field) => {
                const key = field.key as string;
                const error = validationErrors[key];
                return (
                  <label key={key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-100">
                        {field.label}
                        {field.required ? <span className="ml-1 text-rose-300">*</span> : null}
                      </span>
                      {error && <span className="text-xs text-rose-300">{error}</span>}
                    </div>
                    {field.description && (
                      <p className="text-xs text-slate-400">{field.description}</p>
                    )}
                    {renderField(field)}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
