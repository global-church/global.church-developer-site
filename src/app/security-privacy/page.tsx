// src/app/security-privacy/page.tsx

import { ShieldCheck, KeyRound, Lock, DatabaseZap, Zap, GitPullRequest, RotateCw, Network } from "lucide-react";
import ContentPage from "../../components/ContentPage";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import Link from 'next/link';

const securityFeatures = [
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: "Secure API Gateway",
    description: "Our platform is built around a secure API gateway that serves as a single, protected point of entry for all data. This architecture prevents direct access to our backend infrastructure, ensuring every request is authenticated and authorized before processing.",
  },
  {
    icon: <KeyRound className="w-8 h-8 text-primary" />,
    title: "Mandatory API Key Authentication",
    description: "All access to the Global.Church API requires a valid API key. Unauthenticated or anonymous requests are rejected, ensuring that only verified partners can interact with our data services.",
  },
  {
    icon: <RotateCw className="w-8 h-8 text-primary" />,
    title: "Automated Key Rotation",
    description: "To minimize the risk of compromised credentials, we employ a fully automated API key rotation system. Keys are programmatically rolled based on a defined lifecycle (e.g., every 90 days) with a configurable overlap window, ensuring zero-downtime security updates for our partners.",
  },
  {
    icon: <DatabaseZap className="w-8 h-8 text-primary" />,
    title: "Backend Abstraction & Security",
    description: "Our API gateway securely manages and injects credentials for our backend services (Supabase). Partner API keys are used only for gateway access; they do not grant direct access to our database, and backend credentials are never exposed to the client.",
  },
  {
    icon: <Zap className="w-8 h-8 text-primary" />,
    title: "Dynamic Rate Limiting",
    description: "To protect our services from abuse and ensure high availability for all partners, we implement dynamic, per-key rate limiting. Each partner is allocated a specific request quota per minute, tailored to their service plan, preventing any single consumer from impacting the platform's stability.",
  },
  {
    icon: <GitPullRequest className="w-8 h-8 text-primary" />,
    title: "Auditable Partner Management",
    description: "API access and partner configurations are managed declaratively through a version-controlled, GitOps workflow. This process ensures that all changes to access policies and rate limits are reviewed, audited, and deployed systematically, providing a transparent and secure management lifecycle.",
  },
];

export default function SecurityPage() {
  return (
    <ContentPage title="Security & Privacy">
      <p className="pb-6">
        Our commitment to protecting our platform, our partners, and our data.
      </p>
      <div className="space-y-12">
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4">
                  {feature.icon}
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Privacy Policy</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              At Global.Church, we are deeply committed to maintaining the trust and confidence of our partners and users. Our privacy policy outlines our practices concerning data collection, use, and protection.
            </p>
            <h3 className="text-xl font-semibold text-card-foreground">Data We Handle</h3>
            <p>
              The Global.Church API exclusively serves public information about church organizations, such as names, addresses, service times, and websites. We do not collect, store, or process any Personal Identifiable Information (PII) of our partners' end-users through our API.
            </p>
            <h3 className="text-xl font-semibold text-card-foreground">Partner Information</h3>
            <p>
              To provide and manage API access, we securely store the necessary contact and organizational information for our registered partners. This information is used solely for service administration, communication, and billing purposes. We do not sell or share our partners' information with third parties.
            </p>
            <h3 className="text-xl font-semibold text-card-foreground">Website Data Collection</h3>
            <p>
              When you visit our developer portal or website, we may use cookies or analytics tools to understand site traffic and improve our services. This data is aggregated and does not personally identify you. Any information submitted through our contact forms is used exclusively to respond to your inquiries.
            </p>
            <h3 className="text-xl font-semibold text-card-foreground">Network Security</h3>
            <p>
              We enforce a strict Cross-Origin Resource Sharing (CORS) policy to ensure that our API can only be accessed from authorized web domains. This prevents malicious actors from making unauthorized client-side requests to our services.
            </p>
          </div>
        </section>

        <Separator />

        <section className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Contact Us</h2>
          <p className="mt-4 text-muted-foreground">
            If you have any questions about our security or privacy practices, please do not hesitate to reach out.
          </p>
          <div className="mt-6">
            <Link href="/contact" passHref>
              <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                Contact Support
              </button>
            </Link>
          </div>
        </section>
      </div>
    </ContentPage>
  );
}