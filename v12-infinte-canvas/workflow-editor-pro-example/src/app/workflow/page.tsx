import { Metadata } from 'next/types';

import SidebarLayout from './layouts/sidebar-layout';
import Workflow from './components/workflow';

export const metadata: Metadata = {
  title: 'React Flow Workflow Template',
  description:
    'A Next.js-based React Flow template designed to help you quickly create, manage, and visualize workflows.',
};

export default async function Page() {
  return (
    <SidebarLayout>
      <Workflow />
    </SidebarLayout>
  );
}
