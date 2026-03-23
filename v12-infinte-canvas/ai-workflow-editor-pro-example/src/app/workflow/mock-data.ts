import { AppEdge, createEdge } from './components/edges';
import { AppNode, createNodeByType } from './components/nodes';

export const initialNodes: AppNode[] = [
  createNodeByType({
    type: 'text-input-node',
    id: 'characterPromptNode',
    data: {
      text: 'Colorful psychedelic modern pattern in 5 words.',
    },
  }),
  createNodeByType({
    type: 'text-input-node',
    id: 'systemNode',
    data: {
      text: 'You are an AI assistant that generates images and text for high quality design projects',
    },
  }),
  createNodeByType({ type: 'generate-text-node', id: 'generateTextNode' }),
  createNodeByType({ type: 'generate-image-node', id: 'generateImageNode' }),
];

export const initialEdges: AppEdge[] = [
  createEdge('systemNode', 'generateTextNode', 'text-output', 'text-system'),
  createEdge(
    'characterPromptNode',
    'generateTextNode',
    'text-output',
    'text-prompt',
  ),
  createEdge(
    'generateTextNode',
    'generateImageNode',
    'text-output',
    'text-prompt',
  ),
];
