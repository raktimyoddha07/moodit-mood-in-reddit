export default function ResultsPage({ params }: { params: { id: string } }) {
  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="card fade-up" style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div className="card-section" style={{ padding: "48px 40px" }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>📊</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 10 }}>
            Search #{params.id} Complete
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 28 }}>
            Results dashboard is being built in Phase 4. Check back soon!
          </p>
          <a
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 10,
              border: "1px solid rgba(124,58,237,0.35)",
              background: "rgba(124,58,237,0.1)",
              color: "#c4b5fd", fontSize: 14, fontWeight: 600,
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            ← Run another search
          </a>
        </div>
      </div>
    </div>
  );
}
