import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Таталізатар выбараў у Каардынацыйную раду",
  description:
    "Зрабіце свой прагноз: абярыце 80 дэлегатаў, адзначце спісы ніжэй за 3% і паспрабуйце адгадаць вынікі выбараў у Каардынацыйную раду.",
  openGraph: {
    title: "Таталізатар выбараў у Каардынацыйную раду",
    description:
      "Абярыце 80 дэлегатаў і паспрабуйце адгадаць вынікі выбараў.",
    url: "https://kr-tatalizatar.vercel.app",
    siteName: "Таталізатар КР",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "be_BY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Таталізатар выбараў у КР",
    description: "Зрабіце свой прагноз вынікаў выбараў.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="be">
      <body>{children}</body>
    </html>
  );
}