export const metadata = {
  title: 'Beacon Qualitative Analyst',
  description: 'Transform research transcripts into academic-quality thematic analysis reports',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}


