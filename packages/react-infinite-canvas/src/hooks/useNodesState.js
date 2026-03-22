import { useState, useCallback } from 'react';
import { applyNodeChanges } from '../utils/changes.js';

export default function useNodesState(initialNodes) {
  const [nodes, setNodes] = useState(initialNodes);
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  return [nodes, setNodes, onNodesChange];
}
