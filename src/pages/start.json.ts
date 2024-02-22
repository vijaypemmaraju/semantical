import type { APIRoute } from "astro";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import driver from "../db/driver";


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
  // find and delete all nodes that contain a _
  // const result1 = await driver.executeQuery(`
  // MATCH (n:Word)
  // WHERE n.word CONTAINS "_"
  // DETACH DELETE n
  // RETURN n
  // `);
  const result = await driver.executeQuery(`
  MATCH p=shortestPath((start:Word)-[*..10]->(end:Word))
  WHERE start.word <> end.word
  AND NOT start.word CONTAINS " "
  AND NOT end.word CONTAINS " "
  RETURN start, end, length(p)
  ORDER BY length(p) DESC
  LIMIT 100
`);

const words = result.records.map((record) => record.toObject());
const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);
const word = words[startOfDay.getDate() % words.length] || {
  start: { properties: { word: "human" } },
  end: { properties: { word: "girl" } },
}

return new Response(JSON.stringify([word.start.properties.word, word.end.properties.word]));
};
