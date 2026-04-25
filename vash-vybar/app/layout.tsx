import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ваш выбар — таталізатар',
  description: 'Таталізатар перад выбарамі ў Каардынацыйную раду',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="be">
      <body>{children}</body>
    </html>
  );
}
