import Link from "next/link";

export default function Home() {
  return (
    <main className="pc-lp">
      <header className="pc-lp-header">
        <div className="pc-lp-brand">Payroll Chap</div>
        <nav className="pc-lp-nav">
          <a href="#about">About</a>
          <a href="#why">Why Us</a>
          <a href="#testimonials">Testimonials</a>
          <a href="#contact">Contact</a>
        </nav>
        <Link href="/dashboard" className="pc-button ghost">
          Product Preview
        </Link>
      </header>

      <section className="pc-lp-section pc-lp-hero">
        <div className="pc-lp-hero-copy">
          <p className="pc-kicker">Payroll Chap</p>
          <h1>Payroll and HR for Tanzania SMEs that are done with Excel errors</h1>
          <p className="pc-lp-sub">
            Run payroll faster, track leave clearly, and generate payslips in minutes. Built for real teams, not
            enterprise complexity.
          </p>
          <div className="pc-lp-cta-row">
            <a href="#contact" className="pc-button">
              Book a Live Demo
            </a>
            <a href="#contact" className="pc-button ghost">
              Start Free Setup
            </a>
          </div>
          <p className="pc-lp-micro">No card required | Setup support included</p>
        </div>
        <div className="pc-lp-image-placeholder">
          <span>Hero Product Screenshot Placeholder</span>
        </div>
      </section>

      <section className="pc-lp-section pc-lp-trust">
        <p>Trusted by growing teams in logistics, retail, healthcare, education, and services</p>
        <div className="pc-lp-logos">
          <div className="pc-lp-logo-box">Logo Placeholder 1</div>
          <div className="pc-lp-logo-box">Logo Placeholder 2</div>
          <div className="pc-lp-logo-box">Logo Placeholder 3</div>
          <div className="pc-lp-logo-box">Logo Placeholder 4</div>
          <div className="pc-lp-logo-box">Logo Placeholder 5</div>
        </div>
      </section>

      <section id="about" className="pc-lp-section pc-lp-grid-2">
        <article className="pc-lp-card">
          <p className="pc-kicker">About</p>
          <h2>About Payroll Chap</h2>
          <p>
            Payroll Chap is a lightweight HR and payroll platform for SMEs in Tanzania. We help teams replace
            spreadsheets with a simple system for employee records, payroll runs, leave approvals, and payslips.
          </p>
          <p>
            Our focus is reliability, speed, and clarity so business owners can spend less time on admin and more
            time growing revenue.
          </p>
        </article>
        <div className="pc-lp-image-placeholder">
          <span>About Team Placeholder</span>
        </div>
      </section>

      <section id="why" className="pc-lp-section">
        <p className="pc-kicker">Why Use Us</p>
        <h2>Why teams choose Payroll Chap</h2>
        <div className="pc-lp-grid-4">
          <article className="pc-lp-card">
            <h3>Fewer payroll mistakes</h3>
            <p>Automatic gross, deductions, and net calculations reduce manual errors.</p>
          </article>
          <article className="pc-lp-card">
            <h3>Faster monthly payroll</h3>
            <p>Generate payroll for all employees in one flow with approval and locking.</p>
          </article>
          <article className="pc-lp-card">
            <h3>Clear leave tracking</h3>
            <p>Stop verbal and paper leave tracking. Requests and approvals stay organized.</p>
          </article>
          <article className="pc-lp-card">
            <h3>Built for Tanzania</h3>
            <p>Localized workflows now, with statutory support roadmap designed for local compliance.</p>
          </article>
        </div>
      </section>

      <section className="pc-lp-section pc-lp-grid-2">
        <article className="pc-lp-card">
          <p className="pc-kicker">Features</p>
          <h2>Everything you need for daily HR and monthly payroll</h2>
          <ul className="pc-lp-feature-list">
            <li>Employee management</li>
            <li>Payroll engine with allowances and deductions</li>
            <li>Payslip generation</li>
            <li>Leave workflows</li>
            <li>Role based access</li>
            <li>Business reports</li>
          </ul>
        </article>
        <div className="pc-lp-image-placeholder">
          <span>Feature UI Placeholder</span>
        </div>
      </section>

      <section className="pc-lp-section pc-lp-grid-2">
        <article className="pc-lp-card">
          <p className="pc-kicker">How It Works</p>
          <h2>Go live in 3 simple steps</h2>
          <ol className="pc-lp-steps">
            <li>Add your employees and salary structure</li>
            <li>Run payroll draft and review totals</li>
            <li>Finalize payroll and share payslips</li>
          </ol>
        </article>
        <div className="pc-lp-image-placeholder">
          <span>How It Works Placeholder</span>
        </div>
      </section>

      <section id="testimonials" className="pc-lp-section">
        <p className="pc-kicker">Testimonials</p>
        <h2>What business owners say</h2>
        <div className="pc-lp-grid-3">
          <article className="pc-lp-card">
            <div className="pc-lp-avatar-placeholder">Testimonial Photo Placeholder</div>
            <p className="pc-lp-quote">
              Payroll day used to take us two full days. Now it takes less than one hour.
            </p>
            <p className="pc-lp-person">Operations Manager, Logistics SME</p>
          </article>
          <article className="pc-lp-card">
            <div className="pc-lp-avatar-placeholder">Testimonial Photo Placeholder</div>
            <p className="pc-lp-quote">
              We finally have one source of truth for salaries, leave, and employee records.
            </p>
            <p className="pc-lp-person">HR Admin, Private School</p>
          </article>
          <article className="pc-lp-card">
            <div className="pc-lp-avatar-placeholder">Testimonial Photo Placeholder</div>
            <p className="pc-lp-quote">
              Simple enough for our admin team and strong enough for finance review.
            </p>
            <p className="pc-lp-person">Business Owner, Retail Group</p>
          </article>
        </div>
      </section>

      <section className="pc-lp-section">
        <p className="pc-kicker">FAQ</p>
        <h2>Common questions before teams switch</h2>
        <div className="pc-lp-faq">
          <details open>
            <summary>Can I manage more than one company?</summary>
            <p>Yes. You can switch between companies with strict data separation.</p>
          </details>
          <details>
            <summary>Do employees get payslips?</summary>
            <p>Yes. Payslips are generated automatically and stored in history.</p>
          </details>
          <details>
            <summary>Is this suitable for small teams?</summary>
            <p>Yes. It is designed for teams from 3 to 200 employees.</p>
          </details>
        </div>
      </section>

      <section id="contact" className="pc-lp-section pc-lp-grid-2">
        <article className="pc-lp-card">
          <p className="pc-kicker">Contact</p>
          <h2>Talk to our team</h2>
          <p>
            Tell us your company size and current payroll process. We will show you the fastest path to go live.
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
              <textarea rows={4} placeholder="Tell us how you run payroll today" />
            </label>
            <button className="pc-button" type="submit">
              Request Demo
            </button>
          </form>
        </article>
        <div className="pc-lp-image-placeholder">
          <span>Contact Team Placeholder</span>
        </div>
      </section>

      <section className="pc-lp-final-cta">
        <h2>Ready to replace payroll chaos with a reliable system</h2>
        <p>Launch Payroll Chap and run your next payroll with confidence</p>
        <div className="pc-lp-cta-row">
          <a href="#contact" className="pc-button">
            Book a Live Demo
          </a>
          <a href="#contact" className="pc-button ghost">
            Start Free Setup
          </a>
        </div>
      </section>
    </main>
  );
}
