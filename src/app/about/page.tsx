import ContentPage from '@/components/ContentPage';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <ContentPage title="About Global.Church">
      <p>
        Global.Church is a FaithTech project born from a simple but powerful idea: what if the global Church could share data seamlessly? Our mission is to break down the technical barriers that isolate church communities, empowering developers, ministries, and individuals to build a more connected ecosystem.
      </p>
      <p>
        Along the way, we realized something fundamental was missing:
        the Christian community lacked a truly global, shared dataset of churches, as well as a common schema to describe them. Recognizing the importance of the <em>local church</em> to the Global church, we set out to compile <strong>the first global, AI‑enriched dataset of churches</strong> and to release it openly to the faith community, side‑by‑side with a missiologist‑approved data schema that invites collaboration, accountability, and continued refinement.
      </p>
      <p>
        We are a team of developers, designers, and data specialists united by a common vision. By creating and maintaining an open-source schema and a free-to-use API, we provide the foundational infrastructure for the next generation of FaithTech applications. Whether it&#39;s helping someone find a new church home, enabling ministries to coordinate efforts, or providing researchers with valuable insights, our work is about creating tools that serve.
      </p>
      <p>
        If you&#39;d like to get in touch or leave feedback, please visit our <Link href="/feedback" className="underline">feedback page</Link>.
      </p>
    </ContentPage>
  );
}

