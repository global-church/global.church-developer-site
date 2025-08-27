import ContentPage from '@/components/ContentPage';
import Accordion from '@/components/Accordion';

const faqItems = [
  {
    question: "How much does the API cost?",
    children: (
      <p>
        The Global.Church API is currently free to use for all developers and ministries. Our goal is to foster innovation, not create financial barriers. As the platform scales, we may introduce usage tiers for high-volume commercial applications to ensure sustainability, but a generous free tier for community projects will always be a core part of our mission.
      </p>
    )
  },
  {
    question: "What is the mission of Global.Church?",
    children: (
      <p>
        Our mission is to build a standardized, open-source data backbone for the global Christian Church. We aim to dismantle data silos by providing a shared schema and a powerful API, empowering FaithTech developers to create applications that help people connect with local church communities more effectively than ever before.
      </p>
    )
  },
  {
    question: "How can I contribute?",
    children: (
      <>
        <p>We welcome contributions in several forms:</p>
        <ul className="list-disc pl-6 mt-4 space-y-2">
          <li><strong>Data Contribution:</strong> Help us grow the database by submitting or correcting church information. (Contribution portal coming soon).</li>
          <li><strong>Code Contribution:</strong> Our projects are open source. Find our repositories on GitHub to contribute to the schema, API gateway, or this explorer application.</li>
          <li><strong>Financial Support:</strong> As a volunteer-run project, donations help us cover infrastructure costs and accelerate development.</li>
        </ul>
      </>
    )
  }
];

export default function FaqPage() {
  return (
    <ContentPage title="Frequently Asked Questions">
      <Accordion items={faqItems} />
    </ContentPage>
  );
}


