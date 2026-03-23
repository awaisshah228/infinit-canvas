// ========== TEXT MODELS ==========

export const OPENAI_TEXT_MODELS = [
  'o1',
  'o1-mini',
  'o1-preview',
  'o3-mini',
  'o3',
  'o4-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'chatgpt-4o-latest',
] as const;

export const TEXT_MODELS = [...OPENAI_TEXT_MODELS] as const;

export type TextModel = (typeof TEXT_MODELS)[number];

export const DEFAULT_TEMPERATURE = 0.7;

export const DEFAULT_TEXT_MODEL = 'gpt-4o-mini';

// ========== IMAGE MODELS ==========

export const OPENAI_IMAGE_MODELS = [
  'gpt-image-1',
  'dall-e-3',
  'dall-e-2',
] as const;
export const IMAGE_MODELS = [...OPENAI_IMAGE_MODELS] as const;

export type ImageModel = (typeof IMAGE_MODELS)[number];

export const IMAGE_SIZES = {
  'gpt-image-1': ['1024x1024', '1024x1536', '1536x1024'],
  'dall-e-3': ['1024x1024', '1024x1792', '1792x1024'],
  'dall-e-2': ['256x256', '512x512', '1024x1024'],
} as Record<ImageModel, ImageSize[]>;

export type ImageSize = `${number}x${number}`;
