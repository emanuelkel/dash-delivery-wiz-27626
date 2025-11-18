import { createDirectus, rest, authentication } from '@directus/sdk';

const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8055';

export const client = createDirectus(directusUrl)
  .with(rest())
  .with(authentication('json', { autoRefresh: true }));