import Link from 'next/link'
import ContentPage from '@/components/ContentPage'

export default function MethodologyPage() {
  return (
    <ContentPage title="Methodology">
      <p className="mb-6">
        Our goal is to provide a trustworthy, developer‑friendly index of Christian churches around the world. To achieve this, we apply clear inclusion criteria, transparent data practices, and quality controls that prioritize safety, accuracy, and respect for the global Body of Christ.
      </p>

      <h2>Inclusion Criteria</h2>
      <p className="mb-6">
        Global.Church includes churches whose publicly stated beliefs generally align with the historic Nicene Creed — in particular, confession of the Triune God (Father, Son, and Holy Spirit) and the divinity, death, and resurrection of Jesus Christ. Our aim is to represent mainstream, creed‑affirming Christian communities across traditions and denominations.
      </p>
      <ul className="my-5">
        <li>Churches should publicly present core beliefs consistent with the Nicene Creed (Trinitarian, Christ‑centered orthodoxy).</li>
        <li>We practice denominational neutrality: inclusion does not signal preference for any tradition.</li>
        <li>Edge cases are reviewed case‑by‑case; we may request clarification from the church before listing.</li>
      </ul>

      <h2>Data Sources & Processing</h2>
      <p className="mb-6">
        Church information is gathered from public sources (e.g., church websites, directories, maps), partner contributions, and community submissions. We use proprietary AI/ML pipelines to normalize, extract, and classify data, including address parsing, geocoding, language detection, and belief/denomination signals derived from public statements.
      </p>
      <ul className="my-5">
        <li>Normalization and deduplication reduce conflicting entries across sources.</li>
        <li>Automated checks flag anomalies for human review.</li>
        <li>Where available, we incorporate verified corrections from churches and trusted partners.</li>
      </ul>

      <h2>Quality, Review, and Updates</h2>
      <p className="mb-6">
        We continually refine the dataset through scheduled crawls, partner syncs, and manual reviews. Records may be added, updated, or removed when better information becomes available or when a church requests changes.
      </p>

      <h2>Important Disclaimers</h2>
      <ul className="my-5">
        <li>
          No endorsement: Inclusion in our index does not constitute endorsement, certification, or affiliation by Global.Church.
        </li>
        <li>
          AI‑assisted data: Displayed fields may be derived from external sources and proprietary AI pipelines. They can be incomplete, out‑of‑date, or inaccurate, and they do not necessarily reflect the views of Global.Church, its contributors, or partners.
        </li>
        <li>
          Independent verification: Developers and end‑users should verify details directly with the church. This dataset is not a substitute for theological or organizational due diligence.
        </li>
        <li>
          Bias & limitations: AI systems can reflect source‑data bias and modeling limitations. We actively mitigate these risks but cannot guarantee error‑free outputs.
        </li>
        <li>
          Dynamic content: Locations, service times, affiliations, and statements of faith can change. Data is provided “as is”, without warranties.
        </li>
      </ul>

      <h2>Corrections, Appeals, and Removals</h2>
      <p className="mb-6">
        We welcome corrections and nuanced context from churches and the developer community. If you represent a church and would like to update, clarify, or remove your listing, please contact us. Developers can also report issues or suggest improvements.
      </p>
      <ul className="my-5">
        <li>Submit feedback at <Link href="/feedback">/feedback</Link>.</li>
        <li>General inquiries at <Link href="/contact">/contact</Link>.</li>
        <li>For API access requests, visit <Link href="/request-access">/request-access</Link>.</li>
      </ul>

      <h2>Ongoing Method Improvements</h2>
      <p className="mb-6">
        We iterate on these methods as technology and community standards evolve. Significant changes to inclusion criteria or processing will be documented to maintain transparency and consistency for developers integrating with our API.
      </p>
      <p className="text-sm text-gray-500 mt-4">Last updated: September 2025</p>
    </ContentPage>
  )
}
