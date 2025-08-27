import ContentPage from '@/components/ContentPage';

export default function ContactPage() {
  return (
    <ContentPage title="Contact Us">
      <p>
        We'd love to hear from you. Please direct your inquiries to the appropriate email address below, and we'll get back to you as soon as we can.
      </p>
      <div className="mt-8 space-y-4">
        <div>
          <h3 className="text-xl font-semibold">General Inquiries</h3>
          <a href="mailto:hello@global.church" className="text-lg">hello@global.church</a>
        </div>
        <div>
          <h3 className="text-xl font-semibold">Technical & API Support</h3>
          <a href="mailto:support@global.church" className="text-lg">support@global.church</a>
        </div>
        <div>
          <h3 className="text-xl font-semibold">Data & Schema Contributions</h3>
          <a href="mailto:data@global.church" className="text-lg">data@global.church</a>
        </div>
      </div>
    </ContentPage>
  );
}


