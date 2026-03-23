export function flattenTree(node, expanded, x = 0, y = 0) {
  const nodes = [];
  const edges = [];
  const hGap = 180;
  const vGap = 80;

  function walk(n, px, py, parentId) {
    const hasChildren = n.children && n.children.length > 0;
    const isExpanded = expanded.has(n.id);

    nodes.push({
      id: n.id,
      type: 'expandable',
      position: { x: px, y: py },
      data: {
        label: n.label,
        hasChildren,
        isExpanded,
        childCount: n.children?.length || 0,
      },
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${n.id}`,
        source: parentId,
        target: n.id,
      });
    }

    if (hasChildren && isExpanded) {
      const totalWidth = (n.children.length - 1) * hGap;
      let startX = px - totalWidth / 2;
      for (const child of n.children) {
        walk(child, startX, py + vGap, n.id);
        startX += hGap;
      }
    }
  }

  walk(node, x, y, null);
  return { nodes, edges };
}
