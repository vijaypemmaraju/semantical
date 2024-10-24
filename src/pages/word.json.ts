import type { APIRoute } from "astro";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import neo4j, { Driver } from "neo4j-driver";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages.mjs";

const anthropic = new Anthropic({
  apiKey: import.meta.env.ANTHROPIC_API_KEY,
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
    .describe("words semantically related to the given word")
    .min(4)
    .max(4),
});
const jsonSchema = zodToJsonSchema(actionItemsSchema, "mySchema");

const extractWordsFromRecords = (records: any[]) => {
  return records.map((record) => record.toObject().p.properties.word);
};

const executeQueryAndReturnWords = async (query: string, params: any) => {
  let { records } = await driver.executeQuery(query, params, {
    database: "neo4j",
  });
  return extractWordsFromRecords(records);
};

const cache = new Map<string, string[]>();

export const GET: APIRoute = async ({ url }) => {
  const word = url.searchParams.get("word");

  if (cache.has(word!)) {
    return new Response(JSON.stringify({ words: cache.get(word!) }));
  }

  const words = await executeQueryAndReturnWords(
    `MATCH (n:Word)-[:ASSOCIATED_WITH]->(p:Word) WHERE n.word = $word RETURN p`,
    { word }
  );
  const words2 = await executeQueryAndReturnWords(
    `MATCH (n:Word)<-[:ASSOCIATED_WITH]-(p:Word) WHERE n.word = $word RETURN p`,
    { word }
  );

  const combinedWords = Array.from(new Set([...words, ...words2]));

  if (combinedWords.length < 2) {
    let extract;
    try {
      extract = await anthropic.messages.create({
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `You produce dictionary words that are semantically related to the provided word. The output should be a json array of 3-5 words.`,
          },
          {
            role: "user",
            content: word || "human",
          },
          {
            role: "assistant",
            content: "[",
          },
        ],
        model: "claude-3-haiku-20240307",
      });
      console.log("extract", extract);
    } catch (e) {
      console.log(e);
      extract = {
        completion: JSON.stringify({ words: [] }),
      };
      return new Response(JSON.stringify({ words: [] }));
    }
    const response = JSON.parse(`[${(extract.content[0] as TextBlock).text}`);
    const output = (Array.from(new Set(response)) as string[]).map((word) =>
      word?.replaceAll("_", " ").toLowerCase()
    );
    driver.executeQuery(
      "MERGE (n:Word {word: $word, created_at: TIMESTAMP()}) RETURN n",
      {
        word: word?.replaceAll("_", " "),
      }
    );
    for (let newWord of output) {
      if (word === newWord) continue;
      driver.executeQuery(
        "MERGE (n:Word {word: $word, created_at: TIMESTAMP()}) RETURN n",
        {
          word: newWord,
        }
      );
      await driver.executeQuery(
        `MATCH (n:Word {word: $input}), (p:Word {word: $word}) MERGE (n)-[:ASSOCIATED_WITH]->(p) RETURN p`,
        { word: newWord, input: word }
      );
      await driver.executeQuery(
        `MATCH (n:Word {word: $input}), (p:Word {word: $word}) MERGE (p)-[:ASSOCIATED_WITH]->(n) RETURN p`,
        { word: newWord, input: word }
      );
    }
    cache.set(word!, output);
    return new Response(JSON.stringify({ words: output }));
  } else {
    cache.set(word!, combinedWords);
    return new Response(JSON.stringify({ words: combinedWords }));
  }
};
