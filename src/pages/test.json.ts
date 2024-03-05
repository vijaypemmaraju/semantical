import type { APIRoute } from "astro";
import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import neo4j, { Driver } from "neo4j-driver";

const togetherai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: "https://api.together.xyz/v1",
});

let driver: Driver;

const connectToNeo4j = async () => {
  const URI = "neo4j+s://6361f1a4.databases.neo4j.io";
  const USER = "neo4j";
  const PASSWORD = process.env.NEO4J_PASSWORD;

  try {
    driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD!));
    await driver.getServerInfo();
  } catch (err: any) {
    console.error(`Connection error\n${err}\nCause: ${err.message}`);
  }
};

connectToNeo4j();

const actionItemsSchema = z.object({
  words: z
    .array(z.string())
    .describe("words semantically related to the given word"),
});
const jsonSchema = zodToJsonSchema(actionItemsSchema, "mySchema");

export const GET: APIRoute = async () => {
  const output = await togetherai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You produce a dictionary word related to the provided word.`,
      },
      {
        role: "user",
        content: "human",
      },
    ],
    model: "mistralai/Mistral-7B-Instruct-v0.1",
    // @ts-ignore – Together.ai supports schema while OpenAI does not
    response_format: { type: "json_object", schema: jsonSchema },
  });

  return new Response(JSON.stringify({ words: output }));
};
