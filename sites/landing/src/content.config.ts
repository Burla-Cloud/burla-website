import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const USER_DOCS_PATH = process.env.USER_DOCS_PATH ?? "../../user-docs";

const docs = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!SUMMARY.md", "!.gitbook/**"],
    base: USER_DOCS_PATH,
    generateId: ({ entry }) => entry.replace(/\.md$/i, ""),
  }),
  schema: z
    .object({
      description: z.string().optional(),
      layout: z.any().optional(),
    })
    .passthrough(),
});

export const collections = { docs };
