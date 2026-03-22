function applyChanges(changes, elements) {
  const updatedElements = [];
  const changesMap = new Map();
  const addItemChanges = [];

  for (const change of changes) {
    if (change.type === 'add') {
      addItemChanges.push(change);
    } else if (change.type === 'remove' || change.type === 'replace') {
      changesMap.set(change.id, [change]);
    } else {
      const existing = changesMap.get(change.id);
      if (existing) {
        existing.push(change);
      } else {
        changesMap.set(change.id, [change]);
      }
    }
  }

  for (const element of elements) {
    const elChanges = changesMap.get(element.id);
    if (!elChanges) {
      updatedElements.push(element);
      continue;
    }
    if (elChanges[0].type === 'remove') continue;
    if (elChanges[0].type === 'replace') {
      updatedElements.push({ ...elChanges[0].item });
      continue;
    }
    const updated = { ...element };
    for (const change of elChanges) {
      applySingleChange(change, updated);
    }
    updatedElements.push(updated);
  }

  for (const change of addItemChanges) {
    if (change.index !== undefined) {
      updatedElements.splice(change.index, 0, { ...change.item });
    } else {
      updatedElements.push({ ...change.item });
    }
  }

  return updatedElements;
}

function applySingleChange(change, element) {
  switch (change.type) {
    case 'select':
      element.selected = change.selected;
      break;
    case 'position':
      if (change.position !== undefined) element.position = change.position;
      if (change.dragging !== undefined) element.dragging = change.dragging;
      break;
    case 'dimensions':
      if (change.dimensions !== undefined) {
        element.measured = { ...change.dimensions };
        if (change.setAttributes === true || change.setAttributes === 'width') {
          element.width = change.dimensions.width;
        }
        if (change.setAttributes === true || change.setAttributes === 'height') {
          element.height = change.dimensions.height;
        }
      }
      break;
  }
}

export function applyNodeChanges(changes, nodes) {
  return applyChanges(changes, nodes);
}

export function applyEdgeChanges(changes, edges) {
  return applyChanges(changes, edges);
}

export function addEdge(edgeParams, edges) {
  if (!edgeParams.source || !edgeParams.target) {
    console.warn('addEdge: source and target are required');
    return edges;
  }
  // Prevent duplicate edges
  const exists = edges.some(
    (e) =>
      e.source === edgeParams.source &&
      e.target === edgeParams.target &&
      (e.sourceHandle || null) === (edgeParams.sourceHandle || null) &&
      (e.targetHandle || null) === (edgeParams.targetHandle || null)
  );
  if (exists) return edges;

  return [...edges, {
    id: edgeParams.id || `e-${edgeParams.source}-${edgeParams.target}`,
    ...edgeParams,
  }];
}
