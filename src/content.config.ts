import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const posts = defineCollection({
  loader: glob({
    pattern: '{essays,tech}/**/*.md',
    base: './src/content',
    generateId: ({ entry }) => entry.split('/').pop()!.replace(/\.md$/, '')
  }),
  schema: z.object({ title: z.string(), description: z.string(), date: z.coerce.date(), category: z.string().default('随笔'), sample: z.boolean().default(false), draft: z.boolean().default(false) })
});
export const collections = { posts };
