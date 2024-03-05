import type { APIRoute } from "astro";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import driver from "../db/driver";

type Start = {
  words: string[];
  path: string[];
};

const cache = new Map<number, Start>();

// Defining the schema we want our data in
const actionItemsSchema = z.object({
  words: z
    .array(z.string())
    .describe("words associated with the given word")
    .max(3),
});
const jsonSchema = zodToJsonSchema(actionItemsSchema, "mySchema");

export const GET: APIRoute = async ({ url }) => {
  if (!driver) {
    throw new Error("Driver is not initialized");
  }

  let seed =
    parseInt(url.searchParams.get("seed")!, 10) || new Date().getTime();

  if (cache.has(seed)) {
    return new Response(JSON.stringify(cache.get(seed)));
  }

  const result = await driver.executeQuery(`
  MATCH (p)
  RETURN p
  ORDER BY p.created_at ASC
  LIMIT 3000
`);

  const words = result.records.map(
    (record) => record.toObject().p.properties.word
  );

  let distanceBetweenWords = 0;
  console.log(words, words[seed % 3000]);
  let start = words[seed % 3000];
  let distance = 0;
  let shortestPath = [];
  seed += 1;

  const pairs = [];
  while (pairs.length < 9) {
    const end = words[seed % 3000];
    const twoRandomWords = [start, end];

    const result = await driver.executeQuery(
      `
    MATCH (n:Word {word: $word1}), (p:Word {word: $word2}),
    path = shortestPath((n)-[*]-(p))
    WHERE n <> p
    RETURN length(path) as score, path
  `,
      {
        word1: twoRandomWords[0],
        word2: twoRandomWords[1],
      }
    );
    distanceBetweenWords = Number(result.records[0]?.get("score")) || Infinity;
    seed = (seed + 100) % 3000;
    shortestPath =
      result.records[0]
        ?.get("path")
        .segments.map((segment: any) => segment.start.properties.word) || [];

    console.log(twoRandomWords, distanceBetweenWords, pairs.length);
    if (distanceBetweenWords >= 3 && distanceBetweenWords <= 12) {
      pairs.push({ word: twoRandomWords[1], path: shortestPath });
    }

    seed += 100;
  }

  const final = { start, ends: pairs };

  return new Response(JSON.stringify(final));
};
