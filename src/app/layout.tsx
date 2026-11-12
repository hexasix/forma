import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Forma — Make room for good work',
  description:
    'A calmer place for your tasks. Plan, collaborate, and move work forward with your own private kanban board.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
