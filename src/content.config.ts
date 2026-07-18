import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    experiences: z
      .array(
        z.object({
          period: z.string(),
          city: z.string().optional(),
          company: z.string(),
          department: z.string().optional(),
          role: z.string(),
          current: z.boolean().default(false),
        })
      )
      .default([]),
    contacts: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          href: z.string(),
        })
      )
      .default([]),
  }),
});

export const collections = { blog, pages };
