import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

export const metadata: Metadata = {
  title: 'TaskFlow', // Update title
  description: 'Organize and conquer your tasks with AI-powered prioritization.', // Update description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`antialiased font-sans`}> {/* Use Geist Sans by default */}
        {children}
        <Toaster /> {/* Add Toaster component for notifications */}
      </body>
    </html>
  );
}
