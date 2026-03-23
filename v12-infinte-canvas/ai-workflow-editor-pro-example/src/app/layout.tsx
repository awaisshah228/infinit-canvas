// TODO FIXME this needs to be added in order to make the app work on production build,
// for some reason, usage of `useAppStore` hook breaks the production build, but not the dev build.
// The server side rendering is absolutely not needed in this context.
// It will cause: Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).
// Uncaught TypeError: can't access property "C", u is undefined  pointing to `RunnableNodeHeader` component usage of `useWorkflowRunner` and `useAppStore`.
'use client';
import { InfiniteCanvasProvider } from '@infinit-canvas/react';

import { AppStoreProvider } from '@/app/workflow/store';
import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';
import { initialEdges, initialNodes } from './workflow/mock-data';

export default function WorkflowLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppStoreProvider
          initialState={{ nodes: initialNodes, edges: initialEdges }}
        >
          <InfiniteCanvasProvider
            initialNodes={initialNodes}
            initialEdges={initialEdges}
          >
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
