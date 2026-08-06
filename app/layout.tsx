import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deconstruct.ai — Understand any codebase visually',
  description:
    'An AI-powered reverse engineering platform that transforms unfamiliar codebases into an interactive learning experience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
