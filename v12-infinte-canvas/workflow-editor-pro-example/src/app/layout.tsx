import { InfiniteCanvasProvider } from '@infinit-canvas/react';

import { ThemeProvider } from '@/components/theme-provider';
import { AppStoreProvider } from '@/app/workflow/store';

import './globals.css';
import { loadData } from './workflow/mock-data';

export default async function WorkflowLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { nodes, edges } = await loadData();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppStoreProvider initialState={{ nodes, edges }}>
          <InfiniteCanvasProvider initialNodes={nodes} initialEdges={edges}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </InfiniteCanvasProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
