import type { APIRoute } from "astro";
import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import neo4j, { Driver } from "neo4j-driver";

// Defining the Together.ai client
const togetherai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: "https://api.together.xyz/v1",
});

let driver: Driver;

(async () => {
  const URI = "neo4j+s://6361f1a4.databases.neo4j.io";
  const USER = "neo4j";
  const PASSWORD = process.env.NEO4J_PASSWORD;

  try {
    driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD!));
    const serverInfo = await driver.getServerInfo();
    console.log("Connection established");
    console.log(serverInfo);
  } catch (err) {
    console.log(`Connection error\n${err}\nCause: ${(err as any).cause}`);
  }
})();

// Defining the schema we want our data in
const actionItemsSchema = z.object({
  words: z
    .array(z.string())
    .describe("words associated with the given word")
    .max(3),
});
const jsonSchema = zodToJsonSchema(actionItemsSchema, "mySchema");

export const GET: APIRoute = async ({ url }) => {
  // // delete all nodes
  // await driver.executeQuery('MATCH (n) DETACH DELETE n');

  const word = url.searchParams.get("word");
  console.log(word);
  let { records, summary } = await driver.executeQuery(
    `MATCH (n:Word)-[:ASSOCIATED_WITH]->(p:Word) WHERE n.word = $word RETURN p`,
    { word },
    { database: "neo4j" }
  );

  const words = records.map(record => record.toObject().p.properties.word);
  console.log(words);
  if (records.length === 0) {
    driver.executeQuery('MERGE (n:Word {word: $word}) RETURN n', { word });
    console.time();
    const extract = await togetherai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You produce words associated with the provided word. The output should be a single word with no punctuation or symbols.`,
        },
        {
          role: "user",
          content: word || "human",
        },
      ],
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      // @ts-ignore – Together.ai supports schema while OpenAI does not
      response_format: { type: "json_object", schema: jsonSchema },
    });
    const output = JSON.parse(extract.choices[0].message.content!);
    console.log(output);
    console.timeEnd();

    // in the graph database, create a new node for each word (if it doesn't already exist). Then, create a relationship between the provided word and each of the words in the output
    for (let newWord of output.words) {
      driver.executeQuery('MERGE (n:Word {word: $word}) RETURN n', { word: newWord });
      const result = await driver.executeQuery(
        `MATCH (n:Word {word: $input}), (p:Word {word: $word}) MERGE (n)-[:ASSOCIATED_WITH]->(p) RETURN p`,
        { word: newWord, input: word }
      );
      // console.log(result);
    }

    return new Response(JSON.stringify(output));
  } else {
    console.log('found exist');
    return new Response(JSON.stringify({ words }));
  }
};
