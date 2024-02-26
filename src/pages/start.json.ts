import type { APIRoute } from "astro";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import driver from "../db/driver";

const cache = new Map<number, string[]>();

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

  const startOfDay = new Date(url.searchParams.get("date") || Date.now());
  startOfDay.setHours(0, 0, 0, 0);

  if (cache.has(startOfDay.getDate())) {
    return new Response(JSON.stringify(cache.get(startOfDay.getDate())));
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
  LIMIT 3000
`);

  const words = result.records.map(
    (record) => record.toObject().p.properties.word
  );

  let distanceBetweenWords = 0;

  let seed = Math.pow(startOfDay.getTime(), 2) % words.length;

  let twoRandomWords = words.slice(seed, (seed + 2) % words.length);
  while (distanceBetweenWords < 8) {
    twoRandomWords = words.slice(seed, (seed + 2) % words.length);

    const result = await driver.executeQuery(
      `
    MATCH (n:Word {word: $word1}), (p:Word {word: $word2})
    WHERE n <> p
    RETURN length(shortestPath((n)-[*]-(p))) AS score
  `,
      {
        word1: twoRandomWords[0],
        word2: twoRandomWords[1],
      }
    );
    distanceBetweenWords = result.records[0].get("score");
    seed = (seed + 1) % words.length;
    console.log(twoRandomWords, distanceBetweenWords.toString());
  }

  cache.set(startOfDay.getDate(), twoRandomWords);

  return new Response(JSON.stringify(twoRandomWords));
};
