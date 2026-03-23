import { InfiniteCanvas, Background } from '@infinit-canvas/react';

import '@infinit-canvas/react/styles.css';

import { nodes, edges } from './initialElements';

/**
 * This example demonstrates how you can remove the attribution from the React Flow renderer.
 */

const proOptions = { hideAttribution: true };

function InfiniteCanvasPro() {
  return (
    <InfiniteCanvas
      proOptions={proOptions}
      defaultNodes={nodes}
      defaultEdges={edges}
      fitView
    >
      <Background />
    </InfiniteCanvas>
  );
}

export default InfiniteCanvasPro;
