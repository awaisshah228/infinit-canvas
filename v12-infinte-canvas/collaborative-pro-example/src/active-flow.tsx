import { useEffect, useRef, useState } from 'react';
import { Share2, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import {
  InfiniteCanvas,
  MiniMap,
  Controls,
  Background,
  Panel,
  useReactFlow,
  useNodesInitialized,
} from '@infinit-canvas/react';

import { CheckboxNode } from '@/components/nodes/CheckboxNode';
import { TextNode } from '@/components/nodes/TextNode';

import { ContextMenu } from '@/components/ContextMenu';
import { Cursors } from '@/components/cursors';
import { Connections } from '@/components/connections';

import { useAppStore } from './store-context';

import type { StoreState } from './types';

// Register custom node types
const nodeTypes = {
  checkbox: CheckboxNode,
  text: TextNode,
};

const selector = (state: StoreState) => ({
  activeFlowId: state.activeFlowId,
  nodes: state.nodes,
  edges: state.edges,
  exitFlow: state.exitFlow,
  joinFlow: state.joinFlow,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});

/** Fits the view when the flow has nodes and they are initialized (e.g. after creating or joining a flow). */
function FitViewOnLoad() {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const fittedForFlowId = useRef<string | null>(null);
  const activeFlowId = useAppStore((s) => s.activeFlowId);
  const nodes = useAppStore((s) => s.nodes);

  useEffect(() => {
    if (
      activeFlowId &&
      nodesInitialized &&
      nodes.length > 0 &&
      fittedForFlowId.current !== activeFlowId
    ) {
      fittedForFlowId.current = activeFlowId;
      fitView({ padding: 0.1 });
    }
  }, [activeFlowId, nodesInitialized, nodes.length, fitView]);

  return null;
}

export function Flow() {
  const {
    nodes,
    edges,
    activeFlowId,
    exitFlow,
    joinFlow,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useAppStore(useShallow(selector));
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });

  const hideContextMenu = () => {
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const [copyFlowText, setCopyFlowText] = useState<string>('Share');
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    if (activeFlowId) {
      const url = new URL(window.location.href);
      url.searchParams.set('flow', activeFlowId);
      const shareUrl = url.toString();
      setShareUrl(shareUrl);
    }
  }, [activeFlowId]);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        // Right mouse button is button 2
        if (e.button !== 2) {
          hideContextMenu();
        }
      }}
      onPaneContextMenu={(
        e: MouseEvent | React.MouseEvent<Element, MouseEvent>,
      ) => {
        e.preventDefault(); // Prevent default context menu
        setContextMenu({
          x: e.clientX - 150,
          y: e.clientY - 50,
          visible: true,
        });
      }}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      minZoom={0}
    >
      <FitViewOnLoad />
      <MiniMap />
      <Controls />
      <Background />

      <Panel
        className="flex gap-2 items-center h-10 w-full"
        position="top-left"
      >
        <button
          className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 cursor-pointer p-2 rounded-md flex items-center gap-2"
          onClick={exitFlow}
        >
          <X className="h-4 w-4" />
          Exit
        </button>
        {joinFlow && (
          <button
            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700
            cursor-pointer p-2 rounded-md flex items-center gap-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl.toString());
                setCopyFlowText('Copied to clipboard!');
              } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                setCopyFlowText('Failed to copy to clipboard!');
              }
            }}
          >
            <Share2 className="h-4 w-4" />
            {copyFlowText}
          </button>
        )}
      </Panel>

      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onHide={hideContextMenu}
      />

      <Cursors />
      <Connections />
    </InfiniteCanvas>
  );
}
