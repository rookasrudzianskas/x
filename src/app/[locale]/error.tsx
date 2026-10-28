"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const locale = useParams<{ locale: string }>().locale === "lt" ? "lt" : "en";
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "100px auto",
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: 54,
          fontWeight: 400,
        }}
      >
        {locale === "lt" ? "Pabandykime dar kartą." : "Let’s try that again."}
      </h1>
      <p role="alert">
        {locale === "lt"
          ? "Šio puslapio įkelti nepavyko."
          : "This page couldn’t be loaded."}
      </p>
      <button
        onClick={reset}
        style={{
          margin: 24,
          padding: "12px 22px",
          background: "#0033ff",
          color: "#fff",
          border: 0,
          borderRadius: 10,
        }}
      >
        {locale === "lt" ? "Bandyti dar kartą" : "Try again"}
      </button>
      <Link href={`/${locale}/worth`}>
        {locale === "lt" ? "Į skaičiuoklę" : "Back to calculator"}
      </Link>
    </main>
  );
}
