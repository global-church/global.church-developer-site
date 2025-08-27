import ContentPage from '@/components/ContentPage';
import Link from 'next/link';

export default function McpServerPage() {
  return (
    <ContentPage title="MCP Server">
      <div className="text-center">
        <p className="text-2xl font-semibold mb-4">Coming Soon</p>
        <p>
          We are actively planning the development of a Mission Critical Platform (MCP) server for the Global.Church database via Zuplo. This will enable real-time updates, federated data contributions, and a more robust, decentralized data ecosystem.
        </p>
        <p>
          If you are interested in contributing to or learning more about this initiative, please <Link href="/contact">get in touch</Link>.
        </p>
      </div>
    </ContentPage>
  );
}


