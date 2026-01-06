import { RiceDBClient } from "../src";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";
// const SSL = (process.env.SSL || "false").toLowerCase() === "true"; // Not supporting SSL config in constructor easily yet, assuming insecure for local

function printResult(name: string, passed: boolean, detail: string = "") {
  const icon = passed ? "✅" : "❌";
  console.log(`   ${icon} ${name}: ${detail}`);
}

async function main() {
  console.log("🍚 RiceDB Accuracy Test\n");
  const client = new RiceDBClient(HOST, "auto", PORT);

  console.log("Connecting...");
  try {
    await client.connect();
  } catch (e) {
    console.log("❌ Connection failed", e);
    return;
  }

  try {
    await client.login("admin", PASSWORD);
  } catch (e) {
    console.log(`❌ Login failed: ${e}`);
    return;
  }

  const baseId = 2000;

  console.log("1️⃣  Ingesting Test Corpus...");
  const corpus = [
    {
      id: baseId + 1,
      text: "The quick brown fox jumps over the lazy dog.",
      tag: "fox",
    },
    {
      id: baseId + 2,
      text: "A fast brown wolf leaps over the sleepy canine.",
      tag: "wolf",
    },
    {
      id: baseId + 3,
      text: "RiceDB uses Hyperdimensional Computing for fast retrieval.",
      tag: "ricedb",
    },
    {
      id: baseId + 4,
      text: "Vector databases use float embeddings from LLMs.",
      tag: "vector",
    },
    { id: baseId + 5, text: "Apples and oranges are fruits.", tag: "fruit" },
  ];

  for (const item of corpus) {
    await client.insert(item.id, item.text, { tag: item.tag }, 1);
  }

  console.log("   ✓ Ingested 5 documents");

  console.log("\n2️⃣  Running Queries...");

  // Test 1: Exact keyword match
  let results = await client.search("brown fox", 1, 10);
  let foundItem = results.find((r) => r.id.toNumber() === baseId + 1);
  let match = foundItem !== undefined;
  let detail = "Not found in top 10";
  if (foundItem) {
    const rank = results.indexOf(foundItem) + 1;
    detail = `Found at rank ${rank}. Score: ${foundItem.similarity}`;
  } else if (results.length > 0) {
    const top = results[0];
    detail = `Top: ${top.id} (Score: ${top.similarity})`;
  }
  printResult("Keyword Match ('brown fox')", match, detail);

  // Test 2: Partial overlap
  results = await client.search("quick dog", 1, 1);
  match = results.length > 0 && results[0].id.toNumber() === baseId + 1;
  let topMeta = results.length > 0 ? results[0].metadata : {};
  printResult(
    "Partial Overlap ('quick dog')",
    match,
    `Top: ${topMeta.tag} (ID: ${results.length > 0 ? results[0].id : "None"})`
  );

  // Test 3: Sentence subset
  results = await client.search("Hyperdimensional Computing", 1, 1);
  match = results.length > 0 && results[0].id.toNumber() === baseId + 3;
  topMeta = results.length > 0 ? results[0].metadata : {};
  printResult(
    "Subset Match ('Hyperdimensional Computing')",
    match,
    `Top: ${topMeta.tag} (ID: ${results.length > 0 ? results[0].id : "None"})`
  );

  // Test 4: Irrelevant query
  results = await client.search("Space rockets to Mars", 1, 1);
  const dist = results.length > 0 ? results[0].similarity : 0;
  const isRandom = dist > 4500;
  printResult(
    "Irrelevant Query ('Space rockets...')",
    isRandom,
    `Distance: ${dist.toFixed(1)} (Should be high ~5000)`
  );

  // Test 5: Distractor
  results = await client.search("Apples", 1, 1);
  match = results.length > 0 && results[0].id.toNumber() === baseId + 5;
  topMeta = results.length > 0 ? results[0].metadata : {};
  printResult(
    "Distractor Test ('Apples')",
    match,
    `Top: ${topMeta.tag} (ID: ${results.length > 0 ? results[0].id : "None"})`
  );

  client.disconnect();
}

main();
