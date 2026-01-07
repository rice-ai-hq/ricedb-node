import { RiceDBClient } from "../src";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";

async function main() {
  console.log(" RiceDB Remote gRPC Test");
  console.log(`Target: ${HOST}:${PORT}`);

  // Using gRPC transport explicitly
  // Host, Transport, gRPC Port, HTTP Port
  const client = new RiceDBClient(HOST, "grpc", PORT, 3000);

  try {
    console.log("Connecting...");
    await client.connect();
    console.log(" Connected");

    const health = await client.health();
    console.log("Health:", health);

    console.log("Logging in...");
    await client.login("admin", PASSWORD);
    console.log(" Logged in");

    const nodeId = 88888;
    console.log(`Inserting test node ${nodeId}...`);
    await client.insert(nodeId, "Remote gRPC test from Node.js client", {
      source: "node-client-remote-grpc",
    });
    console.log(" Inserted");

    console.log("Searching...");
    const results = await client.search("Remote gRPC test", 1, 5);
    console.log(`Found ${results.length} results.`);
    results.forEach((r) => {
      console.log(
        `- [${r.id}] Score: ${r.similarity}, Meta: ${JSON.stringify(
          r.metadata
        )}`
      );
    });
  } catch (e) {
    console.error(" Error:", e);
  } finally {
    client.disconnect();
  }
}

main();
