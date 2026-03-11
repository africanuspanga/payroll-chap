import Image from "next/image";
import Link from "next/link";

const proofStats = [
  { value: "12 min", label: "average draft-to-review payroll flow" },
  { value: "4 roles", label: "owner, HR, accountant, and employee views" },
  { value: "1 workspace", label: "employee records, leave, payroll, and reports" },
  { value: "TZ ready", label: "built around Tanzania SME workflows" },
];

const featureCards = [
  {
    title: "Payroll that finance can review quickly",
    copy: "Draft, validate, approve, and lock payroll runs with cleaner totals and less spreadsheet chasing.",
  },
  {
    title: "Leave requests that flow into payroll",
    copy: "Approvals and unpaid leave stay visible so payroll changes are captured before month end.",
  },
  {
    title: "Employee data in one calm system",
    copy: "Keep salary structure, payment method, and core profile details together instead of across files.",
  },
  {
    title: "Reports leaders can act on",
    copy: "See payroll summaries, compliance reminders, and operational signals from one dashboard.",
  },
];

const operatingScenes = [
  {
    title: "See the numbers before payroll day gets noisy",
    copy: "A live command view helps teams spot totals, trends, and outliers before final approval.",
    image: "/istockphoto-1480239160-612x612.jpg",
    alt: "Analytics dashboards floating above a laptop and tablet during financial review.",
  },
  {
    title: "Onboard with guided support instead of back-and-forth",
    copy: "Move employee records and payroll setup into one workflow with a cleaner handoff between teams.",
    image: "/istockphoto-2161140197-612x612.jpg",
    alt: "Two people shaking hands across a desk during a business onboarding meeting.",
  },
  {
    title: "Give operators a system that feels clear immediately",
    copy: "A better first impression matters when owners, HR admins, and finance leads all touch payroll.",
    image: "/istockphoto-1394347226-612x612.jpg",
    alt: "A smiling professional greeting another person during a business conversation.",
  },
];

const testimonials = [
  {
    quote: "Payroll day used to feel like a scramble. Now our approvals and totals are visible much earlier.",
    person: "Operations lead, logistics SME",
  },
  {
    quote: "The biggest win is not speed alone. It is having one place for leave, salaries, and review.",
    person: "HR admin, private school group",
  },
  {
    quote: "It feels structured enough for finance but still simple enough for a small team to use every week.",
    person: "Founder, retail business",
  },
];

const faqs = [
  {
    question: "Can I manage more than one company?",
    answer: "Yes. The product is structured for multi-company workflows with separated records and role-aware access.",
  },
  {
    question: "Do employees get payslips and leave visibility?",
    answer: "Yes. The platform includes employee-facing states for payroll and leave workflows.",
  },
  {
    question: "Is it suitable for smaller teams?",
    answer: "Yes. The current product direction is aimed at SMEs that want structure without enterprise overhead.",
  },
];

export default function Home() {
  return (
    <main className="pc-lp">
      <header className="pc-lp-header">
        <div className="pc-lp-brand-stack">
          <div className="pc-lp-brand">Payroll Chap</div>
          <span>Payroll command center for Tanzania SMEs</span>
        </div>

        <nav className="pc-lp-nav">
          <a href="#about">About</a>
          <a href="#why">Why Us</a>
          <a href="#testimonials">Proof</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="pc-lp-header-actions">
          <a href="#contact" className="pc-button ghost">
            Book a Demo
          </a>
          <Link href="/dashboard" className="pc-button">
            Product Preview
          </Link>
        </div>
      </header>

      <section className="pc-lp-section pc-lp-hero">
        <div className="pc-lp-hero-copy">
          <p className="pc-kicker">Payroll Chap</p>
          <h1>Run payroll, leave, and approvals from one calm command center.</h1>
          <p className="pc-lp-sub">
            Built for Tanzania SMEs that have outgrown scattered spreadsheets. Keep employee records, payroll runs,
            leave approvals, and reporting in one cleaner workflow.
          </p>

          <div className="pc-lp-pill-row">
            <span className="pc-lp-pill">Leave synced to payroll</span>
            <span className="pc-lp-pill">Approval trails built in</span>
            <span className="pc-lp-pill">Fast SME onboarding</span>
          </div>

          <div className="pc-lp-cta-row">
            <a href="#contact" className="pc-button">
              Book a Live Demo
            </a>
            <Link href="/dashboard" className="pc-button ghost">
              Explore Product Preview
            </Link>
          </div>

          <div className="pc-lp-mini-stats">
            {proofStats.slice(0, 3).map((stat) => (
              <article key={stat.label} className="pc-lp-mini-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="pc-lp-hero-visual">
          <article className="pc-lp-image-card pc-lp-image-card-main">
            <Image
              src="/istockphoto-2096475191-612x612.jpg"
              alt="Digital payroll and reporting dashboard with charts and operational metrics."
              fill
              priority
              sizes="(max-width: 1100px) 100vw, 42vw"
              className="pc-lp-image"
            />
            <div className="pc-lp-surface-note">
              <p>Monthly payroll runway</p>
              <strong>12 min</strong>
              <span>from draft to finance review</span>
            </div>
            <div className="pc-lp-image-caption">A clearer operating view before payroll day gets busy.</div>
          </article>

          <article className="pc-lp-floating-note">
            <span>One workflow</span>
            <strong>Employees, leave, payroll, and sign-off stay connected.</strong>
          </article>

          <article className="pc-lp-image-card pc-lp-image-card-side">
            <Image
              src="/istockphoto-1789982911-612x612.jpg"
              alt="Business leader looking ahead confidently in a bright office."
              fill
              priority
              sizes="(max-width: 1100px) 50vw, 18vw"
              className="pc-lp-image"
            />
            <div className="pc-lp-image-caption">Built for owners who want confidence, not payroll drama.</div>
          </article>
        </div>
      </section>

      <section className="pc-lp-section pc-lp-proof-strip">
        {proofStats.map((stat) => (
          <article key={stat.label} className="pc-lp-proof-card">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </section>

      <section id="about" className="pc-lp-section pc-lp-story">
        <div className="pc-lp-story-media">
          <Image
            src="/istockphoto-1191817260-612x612.jpg"
            alt="A team of professionals standing together in a boardroom."
            fill
            sizes="(max-width: 1100px) 100vw, 48vw"
            className="pc-lp-image"
          />
          <div className="pc-lp-overlay-card">
            <p>Built for real operators</p>
            <strong>Teams moving from Excel into one shared payroll rhythm.</strong>
          </div>
        </div>

        <article className="pc-lp-card pc-lp-story-card">
          <p className="pc-kicker">About</p>
          <h2>Payroll Chap is designed for the people who actually carry payroll across the line.</h2>
          <p>
            Small and mid-sized teams need a product that feels structured, fast, and readable. The goal is not more
            software ceremony. The goal is fewer missed details, faster reviews, and less end-of-month friction.
          </p>
          <ul className="pc-lp-check-list">
            <li>Employee records and salary structure in one place</li>
            <li>Leave requests and approvals visible before payroll finalization</li>
            <li>Role-aware views for owners, HR, accountants, and employees</li>
            <li>Reports and operational cues without spreadsheet digging</li>
          </ul>
        </article>
      </section>

      <section id="why" className="pc-lp-section">
        <div className="pc-lp-section-head">
          <p className="pc-kicker">Why Teams Switch</p>
          <h2>Less chasing. Cleaner approvals. Better payroll days.</h2>
          <p>
            Payroll Chap is structured around the operational moments that usually create noise: setup, review,
            approval, and follow-up.
          </p>
        </div>

        <div className="pc-lp-grid-4">
          {featureCards.map((feature) => (
            <article key={feature.title} className="pc-lp-card pc-lp-feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pc-lp-section pc-lp-showcase">
        <article className="pc-lp-card pc-lp-analytics-panel">
          <div className="pc-lp-section-head pc-lp-section-head-tight">
            <p className="pc-kicker">Inside The Flow</p>
            <h2>A homepage that now shows the product mood instead of placeholders.</h2>
            <p>
              The visual story combines product intelligence, people, and onboarding momentum so the landing page feels
              closer to the service you are selling.
            </p>
          </div>

          <div className="pc-lp-panel-image">
            <Image
              src="/istockphoto-1480239160-612x612.jpg"
              alt="Business analytics interface layered over a laptop and tablet."
              fill
              sizes="(max-width: 1100px) 100vw, 46vw"
              className="pc-lp-image"
            />
          </div>

          <div className="pc-lp-panel-list">
            <article>
              <strong>Payroll drafts</strong>
              <span>Review totals and exceptions without spreadsheet gymnastics.</span>
            </article>
            <article>
              <strong>Leave visibility</strong>
              <span>See request flow and payroll impact in the same operating rhythm.</span>
            </article>
            <article>
              <strong>Multi-role review</strong>
              <span>Owners, HR, and finance each get a cleaner handoff point.</span>
            </article>
            <article>
              <strong>Audit-friendly flow</strong>
              <span>Approvals, changes, and status movement become easier to explain.</span>
            </article>
          </div>
        </article>

        <div className="pc-lp-scene-grid">
          {operatingScenes.map((scene) => (
            <article key={scene.title} className="pc-lp-scene-card">
              <div className="pc-lp-scene-media">
                <Image
                  src={scene.image}
                  alt={scene.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 26vw"
                  className="pc-lp-image"
                />
              </div>
              <div className="pc-lp-scene-copy">
                <h3>{scene.title}</h3>
                <p>{scene.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="testimonials" className="pc-lp-section">
        <div className="pc-lp-section-head">
          <p className="pc-kicker">Proof</p>
          <h2>What teams want after the switch</h2>
          <p>Speed matters, but clarity is what usually wins the room at payroll review time.</p>
        </div>

        <div className="pc-lp-grid-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.person} className="pc-lp-card pc-lp-quote-card">
              <span className="pc-lp-quote-mark">“</span>
              <p className="pc-lp-quote">{testimonial.quote}</p>
              <p className="pc-lp-person">{testimonial.person}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pc-lp-section">
        <div className="pc-lp-section-head">
          <p className="pc-kicker">FAQ</p>
          <h2>Common questions before teams move off spreadsheets</h2>
        </div>

        <div className="pc-lp-faq">
          {faqs.map((faq, index) => (
            <details key={faq.question} open={index === 0}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className="pc-lp-section pc-lp-contact-grid">
        <article className="pc-lp-card pc-lp-contact-card">
          <p className="pc-kicker">Contact</p>
          <h2>Tell us how you run payroll today and we will show you the cleanest path forward.</h2>
          <p>
            Share your team size, process, and biggest pain point. We will use that to shape a sharper product demo.
          </p>

          <form className="pc-lp-form">
            <label>
              Full name
              <input type="text" placeholder="Your full name" />
            </label>
            <label>
              Business email
              <input type="email" placeholder="you@company.com" />
            </label>
            <label>
              Phone number
              <input type="tel" placeholder="+255 ..." />
            </label>
            <label>
              Company name
              <input type="text" placeholder="Company name" />
            </label>
            <label>
              Employee count
              <input type="number" min={1} placeholder="20" />
            </label>
            <label>
              Message
              <textarea rows={4} placeholder="Tell us what makes payroll month hard today" />
            </label>
            <button className="pc-button" type="submit">
              Request Demo
            </button>
          </form>
        </article>

        <aside className="pc-lp-contact-side">
          <div className="pc-lp-contact-note">
            <strong>What you can expect</strong>
            <ul className="pc-lp-check-list">
              <li>A focused walkthrough of payroll, leave, and approvals</li>
              <li>Advice on migrating away from manual monthly spreadsheets</li>
              <li>A realistic setup path for your current team size</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="pc-lp-section pc-lp-final-cta">
        <h2>Ready to replace payroll chaos with a steadier monthly workflow?</h2>
        <p>Start with a demo, review the product preview, and shape the setup around your actual payroll process.</p>
        <div className="pc-lp-cta-row">
          <a href="#contact" className="pc-button">
            Book a Live Demo
          </a>
          <Link href="/dashboard" className="pc-button ghost">
            View Product Preview
          </Link>
        </div>
      </section>
    </main>
  );
}
