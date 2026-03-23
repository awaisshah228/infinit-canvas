import { Metadata } from 'next/types';

import SidebarLayout from './layouts/sidebar-layout';
import { WorkflowClient } from './components/workflow-client';

export const metadata: Metadata = {
  title: 'React Flow AI Workflow Template',
  description:
    'A Next.js-based React Flow template designed to help you quickly create, manage, and visualize AI workflows.',
};

export default async function Page() {
  return (
    <SidebarLayout>
      <WorkflowClient />
    </SidebarLayout>
  );
}
