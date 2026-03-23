'use client';

import { Panel } from '@infinit-canvas/react';
import { Play, Pause } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useWorkflowRunner } from '@/app/workflow/hooks/use-workflow-runner';

export function FlowRunButton() {
  const { runWorkflow, stopWorkflow, isRunning } = useWorkflowRunner();

  const onClickRun = () => {
    if (isRunning) {
      stopWorkflow();
      return;
    }

    runWorkflow();
  };

  return (
    <Panel position="top-right">
      <Button onClick={onClickRun} size="sm" className="text-xs">
        {isRunning ? (
          <>
            <Pause /> Stop Workflow
          </>
        ) : (
          <>
            <Play /> Run Workflow
          </>
        )}
      </Button>
    </Panel>
  );
}
