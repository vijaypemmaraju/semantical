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

  let seed = parseInt(url.searchParams.get("seed")!, 10);

  if (cache.has(seed)) {
    return new Response(JSON.stringify(cache.get(seed)));
  }

  // find and delete all nodes that contain a _
  // const result1 = await driver.executeQuery(`
  // MATCH (n:Word)
  // WHERE n.word CONTAINS "_"
  // DETACH DELETE n
  // RETURN n
  // `);
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
  const mod = Math.min(words.length, 3000);
  seed = Math.pow(seed, 2) % mod;

  let twoRandomWords = words.slice(seed, (seed + 2) % mod);
  let shortestPath = [];
  while (distanceBetweenWords < 5 || distanceBetweenWords > 12) {
    twoRandomWords = words.slice(seed, (seed + 2) % mod);
    if (twoRandomWords.length === 2) {
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
      distanceBetweenWords =
        Number(result.records[0]?.get("score")) || Infinity;
      shortestPath =
        result.records[0]
          ?.get("path")
          .segments.map((segment: any) => segment.start.properties.word) || [];
      console.log(
        twoRandomWords,
        distanceBetweenWords.toString(),
        shortestPath
      );
    }
    seed = (seed + 100) % mod;
  }

  const final = { words: twoRandomWords, path: shortestPath };

  cache.set(seed, final);

  return new Response(JSON.stringify(final));
};
