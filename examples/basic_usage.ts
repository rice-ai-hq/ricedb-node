import { RiceDBClient } from "../src";

async function main() {
  // Auto-detect transport
  const client = new RiceDBClient("localhost");

  console.log("Connecting...");
  try {
    await client.connect();
    console.log("Connected!");

    const health = await client.health();
    console.log("Health:", health);

    // Login (optional if not auth protected yet, but good to have)
    const token = await client.login("admin", "admin");
    console.log("Logged in, token:", token);

    console.log("Inserting node...");
    const insertRes = await client.insert(1, "Hello RiceDB from Node.js!", {
      createdBy: "node-client",
    });
    console.log("Insert result:", insertRes);

    console.log("Searching...");
    const results = await client.search("Hello", 1, 5);
    console.log("Found:", results.length, "results");
    for (const res of results) {
      console.log(
        `- [${res.id}] Score: ${res.similarity}, Metadata:`,
        res.metadata
      );
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    client.disconnect();
  }
}

main();
