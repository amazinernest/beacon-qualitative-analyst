export const metadata = {
  title: 'Beacon Qualitative Analyst',
  description: 'Import research transcripts and analyze responses NVivo-style',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}


