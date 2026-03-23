import ExampleBlock from '../../../components/ExampleBlock';
import OnThisPage from '../../../components/OnThisPage';
import SubFlowsExample from '../../../examples/SubFlowsExample';

const tableOfContents = [
  { href: '#group-nodes', label: 'Group nodes' },
  { href: '#creating-sub-flows', label: 'Creating sub flows' },
  { href: '#nested-nodes', label: 'Nested nodes' },
  { href: '#group-node-type', label: 'Group node type' },
];

export default function SubFlowsPage() {
  return (
    <>
      <div className="page-content">
        <h1>Sub Flows</h1>
        <p>
          Sub flows let you group nodes together. Child nodes move with their parent
          and their positions are relative to the parent node.
        </p>

        <ExampleBlock preview={<SubFlowsExample />} files={[{ name: 'App.jsx', code: `const initialNodes = [
  { id: 'group-1', type: 'group', position: { x: 0, y: 0 }, width: 350, height: 180, data: { label: 'Group A' } },
  { id: 'child-1', position: { x: 20, y: 40 }, data: { label: 'Child 1' }, parentId: 'group-1' },
  { id: 'child-2', position: { x: 180, y: 40 }, data: { label: 'Child 2' }, parentId: 'group-1' },
  { id: 'outside', position: { x: 450, y: 50 }, data: { label: 'Outside' }, type: 'output' },
];` }]} />

        <h2 id="group-nodes">Group nodes</h2>
        <p>
          A group node acts as a container for other nodes. Use the built-in <code>group</code> type
          or create a custom group component.
        </p>
        <pre><code>{`const nodes = [
  {
    id: 'group-1',
    type: 'group',
    position: { x: 0, y: 0 },
    data: { label: 'My Group' },
    width: 400,
    height: 300,
  },
  {
    id: 'child-1',
    position: { x: 20, y: 40 },  // Relative to parent
    data: { label: 'Child Node' },
    parentId: 'group-1',          // Assign to parent
  },
  {
    id: 'child-2',
    position: { x: 200, y: 40 },
    data: { label: 'Another Child' },
    parentId: 'group-1',
  },
];`}</code></pre>

        <h2 id="creating-sub-flows">Creating sub flows</h2>
        <p>
          To create a sub flow, set the <code>parentId</code> property on child nodes.
          Child node positions become relative to their parent's position.
        </p>
        <pre><code>{`// Parent at (100, 100)
// Child at (20, 40) relative to parent
// Child's absolute position = (120, 140)

const nodes = [
  { id: 'parent', type: 'group', position: { x: 100, y: 100 }, width: 300, height: 200 },
  { id: 'child', position: { x: 20, y: 40 }, data: { label: 'Inside' }, parentId: 'parent' },
];`}</code></pre>

        <h2 id="nested-nodes">Nested nodes</h2>
        <p>
          You can nest groups inside groups for deeper hierarchies:
        </p>
        <pre><code>{`const nodes = [
  { id: 'outer', type: 'group', position: { x: 0, y: 0 }, width: 600, height: 400 },
  { id: 'inner', type: 'group', position: { x: 20, y: 40 }, width: 250, height: 150, parentId: 'outer' },
  { id: 'deep', position: { x: 10, y: 30 }, data: { label: 'Deep child' }, parentId: 'inner' },
];`}</code></pre>

        <h2 id="group-node-type">Group node type</h2>
        <p>
          The built-in <code>group</code> type renders a simple container with a label.
          Import it directly if you want to extend it:
        </p>
        <pre><code>{`import { GroupNode } from '@infinit-canvas/react';

// Or create a custom group:
function CustomGroup({ data, selected, width, height }) {
  return (
    <div style={{
      width: width || 300,
      height: height || 200,
      background: 'rgba(59, 130, 246, 0.05)',
      border: selected ? '2px solid #3b82f6' : '1px dashed #93c5fd',
      borderRadius: 8,
      padding: 10,
    }}>
      <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>
        {data.label}
      </div>
    </div>
  );
}

const nodeTypes = { group: CustomGroup };`}</code></pre>
      </div>
      <OnThisPage links={tableOfContents} />
    </>
  );
}
