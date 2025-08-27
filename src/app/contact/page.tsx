import ContentPage from '@/components/ContentPage';

export default function ContactPage() {
  return (
    <ContentPage title="Contact Us">
      <p>
        We&#39;d love to hear from you. Please direct your inquiries to the appropriate email address below, and we&#39;ll get back to you as soon as we can.
      </p>
      <div className="mt-8 space-y-4">
        <div>
          <h3 className="text-xl font-semibold">Leadership & Vision</h3>
          <a href="mailto:paul.martel@global.church" className="text-lg">paul.martel@global.church</a>
        </div>
        <div>
          <h3 className="text-xl font-semibold">Product</h3>
          <a href="mailto:clayton.fike@global.church" className="text-lg">clayton.fike@global.church</a>
        </div>
        <div>
          <h3 className="text-xl font-semibold">Data & Schema</h3>
          <a href="mailto:trent.sikute@global.church" className="text-lg">trent.sikute@global.church</a>
        </div>
      </div>
    </ContentPage>
  );
}


