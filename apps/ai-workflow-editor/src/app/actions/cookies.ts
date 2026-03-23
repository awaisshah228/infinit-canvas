'use server';

import { cookies } from 'next/headers';

export async function setOpenAIApiKeyCookie(openAIApiKey: string | undefined) {
  const cookieStore = await cookies();
  if (openAIApiKey) {
    cookieStore.set('openAIApiKey', openAIApiKey);
  } else {
    cookieStore.delete('openAIApiKey');
  }
}
