import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | null = null;

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

export default driver;
