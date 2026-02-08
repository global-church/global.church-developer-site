"use client";

import ContentPage from '@/components/ContentPage';
import { RequestAccessForm } from '@/components/RequestAccessForm';

export default function RequestAccessPage() {
  return (
    <ContentPage title="Request API Access">
      <p>
        To protect data integrity, security, and fair use, access to the Global.Church API is provisioned by request. Tell us about your organization and intended use, and our team will review your application and issue credentials aligned to your needs.
      </p>
      <div className="not-prose mt-10">
        <RequestAccessForm />
      </div>
    </ContentPage>
  );
}
