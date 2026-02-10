'use client';

import { useUserSession } from '@/contexts/SessionContext';
import { ApiKeyList } from '@/components/developer/ApiKeyList';
import { RequestAccessForm } from '@/components/RequestAccessForm';
import { Clock } from 'lucide-react';

export default function KeysPage() {
  const session = useUserSession();

  if (!session) return null;

  if (!session.apiAccessApproved) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">API Keys</h1>
          <p className="text-gray-500 mt-1">
            Create and manage your API keys for the Global.Church Index.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">API access pending approval</h3>
            <p className="text-sm text-amber-800 mt-1">
              To create API keys, your account needs to be approved first.
              Fill out the form below and our team will review your request.
            </p>
          </div>
        </div>

        <RequestAccessForm
          defaults={{
            fullName: session.displayName ?? undefined,
            email: session.email,
          }}
          successMessage="Your request has been submitted! We'll review it and enable API access for your account. You'll be able to create keys from this page once approved."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">API Keys</h1>
        <p className="text-gray-500 mt-1">
          Create and manage your API keys for the Global.Church Index.
          Keys are passed via the <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">Authorization: Bearer</code> header.
        </p>
      </div>
      <ApiKeyList />
    </div>
  );
}
