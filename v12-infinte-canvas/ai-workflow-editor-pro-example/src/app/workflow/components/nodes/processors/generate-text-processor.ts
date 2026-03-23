import { GenerateTextNodeType } from '../generate-text-node';
import { NodeProcessor } from '..';
import { GenerateTextApiResponse } from '@/app/api/generate-text/route';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_TEXT_MODEL,
} from '@/app/workflow/openai-data';
import { IncomingNodeData } from '@/app/workflow/hooks/use-workflow-runner';

export const processGenerateTextNode: NodeProcessor<
  GenerateTextNodeType
> = async (incomingNodeData: IncomingNodeData, node: GenerateTextNodeType) => {
  const model = node?.data?.config?.model ?? DEFAULT_TEXT_MODEL;
  const temperature = node?.data?.config?.temperature ?? DEFAULT_TEMPERATURE;

  const inPromptNode = incomingNodeData['text-prompt'];
  const incomingPromptText =
    inPromptNode?.length === 1 &&
    inPromptNode[0] &&
    'text' in inPromptNode[0].data
      ? inPromptNode[0].data.text
      : undefined;

  const inSystemNode = incomingNodeData['text-system'];
  const incomingSystemText =
    inSystemNode?.length === 1 &&
    inSystemNode[0] &&
    'text' in inSystemNode[0].data
      ? inSystemNode[0].data.text
      : undefined;

  if (!incomingSystemText || !incomingPromptText) {
    console.error(`No incoming text found for "${node.id}"`);
    return {
      status: 'error',
      error: 'No incoming text found for node',
      text: undefined,
    };
  }

  // Call the local API to generate text
  const response = await fetch('/api/generate-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: incomingPromptText,
      system: incomingSystemText,
      temperature: temperature,
    }),
    credentials: 'include',
  });

  // Handle the response and check for errors
  if (!response.ok) {
    const errorData = await response.json();
    console.error(
      `Error generating text for node ${node.id}:`,
      errorData.error || 'Unknown error',
    );

    return {
      status: 'error',
      error: errorData.error || 'Unknown error',
      text: undefined,
    };
  }

  const result: GenerateTextApiResponse = await response.json();

  // Check if the result contains the expected 'text' property
  // and is a string, if so, update the node data with the result.
  if ('text' in result && typeof result.text === 'string') {
    return {
      status: 'success',
      error: undefined,
      text: result.text,
    };
  } else if ('error' in result && typeof result.error === 'string') {
    console.error(
      `Error: No text returned for node ${node.id}:`,
      result.error || 'Unknown error',
    );
    return {
      status: 'error',
      error: result.error || 'Unknown error',
      text: undefined,
    };
  }

  return {
    status: 'error',
    error: 'No text returned for node',
    text: undefined,
  };
};
