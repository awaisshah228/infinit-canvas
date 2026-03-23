import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/app/workflow/layouts/sidebar-layout/app-sidebar';

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex h-screen w-full flex-col overflow-hidden">
        <SidebarTrigger className="ml-2 mt-2 absolute z-10" />
        {children}
      </main>
    </SidebarProvider>
  );
}
