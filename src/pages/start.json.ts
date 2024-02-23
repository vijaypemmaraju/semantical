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

return new Response(JSON.stringify(['human', 'box']));
};
