import { RiceDBClient } from "../src/index";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";

async function main() {
  console.log("RiceDB Node.js Metadata Filtering Example\n");

  const client = new RiceDBClient(HOST, "grpc", PORT); // Force gRPC for parity

  try {
    if (!(await client.connect())) {
      console.log("Failed to connect");
      return;
    }

    await client.login("admin", PASSWORD);

    console.log("1. Inserting documents...");
    const docs = [
      {
        id: 101,
        text: "The quick brown fox",
        metadata: { category: "animal", color: "brown" },
      },
      {
        id: 102,
        text: "The lazy dog",
        metadata: { category: "animal", color: "white" },
      },
      {
        id: 103,
        text: "The red apple",
        metadata: { category: "fruit", color: "red" },
      },
      {
        id: 104,
        text: "The brown bear",
        metadata: { category: "animal", color: "brown" },
      },
    ];

    for (const doc of docs) {
      await client.insert(doc.id, doc.text, doc.metadata, 1);
      console.log(`   Inserted ID ${doc.id}: ${JSON.stringify(doc.metadata)}`);
    }

    // 2. Search without filter
    console.log("\n2. Search 'brown' without filter:");
    let results = await client.search("brown", 1, 5);
    for (const res of results) {
      console.log(`   - ID ${res.id}: ${JSON.stringify(res.metadata)}`);
    }

    // 3. Search with Filter (Category: animal)
    console.log("\n3. Search 'brown' with filter {category: 'animal'}:");
    results = await client.search("brown", 1, 5, undefined, {
      category: "animal",
    });
    for (const res of results) {
      console.log(`   - ID ${res.id}: ${JSON.stringify(res.metadata)}`);
    }

    // 4. Search with Filter (Color: brown)
    console.log("\n4. Search 'brown' with filter {color: 'brown'}:");
    results = await client.search("brown", 1, 5, undefined, { color: "brown" });
    for (const res of results) {
      console.log(`   - ID ${res.id}: ${JSON.stringify(res.metadata)}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.disconnect();
  }
}

main().catch(console.error);
