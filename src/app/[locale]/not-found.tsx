import Link from "next/link";
export default function NotFound() {
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "100px auto",
        padding: 24,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 14, color: "#0033ff" }}>404</p>
      <h1
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: 64,
          fontWeight: 400,
        }}
      >
        This page wandered off.
      </h1>
      <p>Šio puslapio neradome.</p>
      <p style={{ marginTop: 24 }}>
        <Link href="/en/worth">Back to calculator</Link> ·{" "}
        <Link href="/lt/worth">Į skaičiuoklę</Link>
      </p>
    </main>
  );
}
