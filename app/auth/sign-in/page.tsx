import Link from "next/link";
import { signInWithPassword } from "@/app/auth/sign-in/actions";

type PageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = params.next ?? "/dashboard";
  const error = params.error;

  return (
    <main className="pc-lp" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <article className="pc-card" style={{ width: "100%", maxWidth: 460 }}>
        <p className="pc-kicker">Payroll Chap</p>
        <h1 style={{ marginTop: 0 }}>Sign in</h1>
        <p className="pc-muted">Use your company credentials to access payroll operations.</p>

        {error ? (
          <p
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#9f1239",
              borderRadius: 10,
              padding: "0.7rem 0.8rem",
            }}
          >
            {error}
          </p>
        ) : null}

        <form action={signInWithPassword} style={{ display: "grid", gap: "0.75rem" }}>
          <input type="hidden" name="next" value={next} />
          <label>
            Email
            <input type="email" name="email" required placeholder="you@company.com" />
          </label>
          <label>
            Password
            <input type="password" name="password" required placeholder="********" />
          </label>
          <button type="submit" className="pc-button">
            Sign in
          </button>
        </form>

        <p className="pc-muted" style={{ marginBottom: 0, marginTop: "0.85rem" }}>
          Need help? Contact your admin or owner account.
        </p>
        <p className="pc-muted" style={{ marginBottom: 0 }}>
          <Link href="/">Back to home</Link>
        </p>
      </article>
    </main>
  );
}
