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
  MATCH p=(start:Word)-[L*5..10]->(end:Word)
  RETURN start, end, length(p)
  ORDER BY length(p) DESC
  LIMIT 100
`);
// console.log(result);

const words = result.records.map((record) => record.toObject());
const word = words[Math.floor(Math.random() * words.length)];

return new Response(JSON.stringify([word.start.properties.word, word.end.properties.word]));
};
