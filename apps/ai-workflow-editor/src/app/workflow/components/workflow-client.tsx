'use client';

import dynamic from 'next/dynamic';

const Workflow = dynamic(() => import('./workflow'), { ssr: false });

export function WorkflowClient() {
  return <Workflow />;
}
