import { useState, useCallback } from 'react';
import { applyEdgeChanges } from '../utils/changes.js';

export default function useEdgesState(initialEdges) {
  const [edges, setEdges] = useState(initialEdges);
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  return [edges, setEdges, onEdgesChange];
}
