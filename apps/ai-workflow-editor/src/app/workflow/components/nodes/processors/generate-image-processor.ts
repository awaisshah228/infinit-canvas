import { GenerateImageApiResponse } from '@/app/api/generate-image/route';
import { NodeProcessor } from '..';
import { GenerateImageNodeType } from '../generate-image-node';
import { IncomingNodeData } from '@/app/workflow/hooks/use-workflow-runner';

const DEFAULT_IMAGE_MODEL = 'dall-e-2';
const DEFAULT_IMAGE_SIZE = '512x512';

// calls the API endpoint that exposes Vercel AI SDK `generateImage` functionality.
export const processGenerateImageNode: NodeProcessor<
  GenerateImageNodeType
> = async (incomingNodeData: IncomingNodeData, node: GenerateImageNodeType) => {
  const model = node?.data?.config?.model ?? DEFAULT_IMAGE_MODEL;
  const size = node?.data?.config?.size ?? DEFAULT_IMAGE_SIZE;

  const inPromptNode = incomingNodeData['text-prompt'];
  const incomingPromptText =
    inPromptNode.length === 1 &&
    inPromptNode[0] &&
    'text' in inPromptNode[0].data
      ? inPromptNode[0]?.data.text
      : undefined;

  if (!incomingPromptText) {
    return { status: 'error', error: 'No prompt text found', image: undefined };
  }

  // Call the local API to generate an image
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      prompt: incomingPromptText,
      size: size,
    }),
    credentials: 'include',
  });

  // Handle the response and check for errors
  if (!response.ok) {
    const errorData = await response.json();
    console.error(
      `Error generating image for node ${node.id}:`,
      errorData.error || 'Unknown error',
    );

    return {
      status: 'error',
      error: errorData.error || 'Unknown error',
      image: undefined,
    };
  }
  const result: GenerateImageApiResponse = await response.json();

  if (!('image' in result)) {
    console.error(`No image returned for node ${node.id}`);
    return {
      status: 'error',
      error: 'No image returned for node',
      image: undefined,
    };
  }

  return {
    status: 'success',
    image: result.image,
    error: undefined,
  };
};
