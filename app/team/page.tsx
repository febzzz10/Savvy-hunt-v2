import Image from "next/image";
import { Nav } from "@/components/public";
import { developers, facultyCoordinators, initials, jury, mediaClub, studentCoordinators, type TeamMember } from "@/lib/team";
import "./team.css";

function Avatar({ member, size }: { member: TeamMember; size: number }) {
  return <span className="team-avatar" style={{ width: size, height: size }}>
    {member.photo ? <Image src={member.photo} alt="" width={size} height={size} /> : <span aria-hidden="true">{initials(member.name)}</span>}
  </span>;
}

function Heading({ id, title, accent, tone }: { id: string; title: string; accent?: string; tone: "accent" | "terra" | "gold" | "sage" }) {
  return <h2 className="team-heading" id={id} data-tone={tone}>{title}{accent && <> <span>/ {accent}</span></>}</h2>;
}

function NameList({ names, tone, columns }: { names: string[]; tone: "gold" | "accent" | "terra"; columns?: boolean }) {
  return <ol className="team-names" data-tone={tone} data-columns={columns || undefined}>
    {names.map((name, index) => <li key={name}><span className="team-index">{index + 1}</span>{name}</li>)}
  </ol>;
}

export default function Page() {
  return <><Nav /><main id="main-content" tabIndex={-1} className="shell team-page">
    <header className="team-hero">
      <div>
        <span className="team-eyebrow">Organizing committee</span>
        <h1>The team behind <em>Savvy Hunt</em></h1>
        <p>Students, coordinators and faculty working together to run the live event, the scoreboard and every small detail in between.</p>
        <nav className="team-jump" aria-label="Team sections">
          <a href="#dev-core">Dev core</a><a href="#student-coordinators">Student coordinators</a><a href="#media-club">Media club</a><a href="#jury">Jury</a><a href="#faculty">Faculty</a>
        </nav>
      </div>
      <aside className="team-note">
        <span className="eyebrow">Core note</span>
        <p>The <strong>lead developers</strong> and coordinators wire up the scoreboard, live events and the Savvy Hunt site you are reading.</p>
        <p className="small">If the site feels smooth, that&apos;s us. If something breaks, that&apos;s not us.</p>
      </aside>
    </header>

    <section aria-labelledby="dev-core">
      <Heading id="dev-core" title="Lead developers" accent="Savvy core" tone="accent" />
      <div className="team-grid team-grid-lead">
        {developers.map(member => <article className="team-card team-card-lead" key={member.name}>
          <span className="team-tag">Core dev</span>
          <Avatar member={member} size={168} />
          <span className="team-role-pill">{member.role}</span>
          <h3>{member.name}</h3>
          {member.subtitle && <p className="team-role">{member.subtitle}</p>}
        </article>)}
      </div>
    </section>

    <section aria-labelledby="student-coordinators">
      <Heading id="student-coordinators" title="Student coordinators" tone="terra" />
      <div className="team-grid team-grid-duo">
        {studentCoordinators.map(member => <article className="team-card" key={member.name}>
          <Avatar member={member} size={84} />
          <h3>{member.name}</h3>
          <p className="team-role">{member.role}</p>
        </article>)}
      </div>
    </section>

    <section aria-labelledby="media-club">
      <Heading id="media-club" title="Media club" tone="terra" />
      <NameList names={mediaClub} tone="terra" columns />
    </section>

    <div className="team-split">
      <section aria-labelledby="jury">
        <Heading id="jury" title="Jury of appeal" tone="gold" />
        <NameList names={jury} tone="gold" />
      </section>
      <section aria-labelledby="faculty">
        <Heading id="faculty" title="Faculty event coordinators" tone="sage" />
        <NameList names={facultyCoordinators} tone="accent" columns />
      </section>
    </div>
  </main></>;
}
