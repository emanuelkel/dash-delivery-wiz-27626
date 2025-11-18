import { createDirectus, rest, authentication } from '@directus/sdk';

const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'https://directus.emanuelgomes.com.br';

export const client = createDirectus(directusUrl)
  .with(rest())
  .with(authentication('json', { autoRefresh: true }));