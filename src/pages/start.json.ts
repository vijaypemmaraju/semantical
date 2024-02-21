import type { APIRoute } from "astro";
import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import neo4j, { Driver } from "neo4j-driver";
import driver from "../db/driver";

// Defining the Together.ai client
const togetherai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: "https://api.together.xyz/v1",
});

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
  const result = await driver.executeQuery(`
  MATCH (t)-[:ASSOCIATED_WITH]->(a)
  MATCH (a)-[:ASSOCIATED_WITH]->(b)
  RETURN a, rand() as r
  ORDER BY r
  LIMIT 100
`);

const words = result.records.map((record) => record.toObject().a.properties.word);
const set = new Set(words);
let uniqueWords = Array.from(set);
console.log(uniqueWords);
if (uniqueWords.length === 0) {
  uniqueWords = ['human', 'girl'];
}

return new Response(JSON.stringify([uniqueWords[0], uniqueWords[1]]));
};
