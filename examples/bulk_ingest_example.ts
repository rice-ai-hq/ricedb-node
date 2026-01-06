import { RiceDBClient } from "../src";
import * as crypto from "crypto";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";

const BATCH_SIZE = 100;
const TOTAL_DOCS = 1000;

const SOURCES = ["Notion", "Gmail", "Slack", "CRM", "Jira"];
const DEPARTMENTS = ["Engineering", "Sales", "HR", "Marketing", "Legal"];
const TOPICS = [
  "Q4 Strategy",
  "Project Alpha Launch",
  "Customer Feedback",
  "Server Outage Incident",
  "Hiring Pipeline",
  "Budget Review",
  "Compliance Audit",
  "API Documentation",
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCorpus(count: number): any[] {
  console.log(`Generating ${count} documents...`);
  const documents = [];

  for (let i = 0; i < count; i++) {
    const source = randomChoice(SOURCES);
    const dept = randomChoice(DEPARTMENTS);
    const topic = randomChoice(TOPICS);
    let content = "";

    if (source === "Slack") {
      content = `Hey @channel, update on ${topic}. We need to sync with ${dept} ASAP. #urgent`;
    } else if (source === "Jira") {
      content = `Bug report: ${topic} failing in production. Assigned to ${dept} team. Priority: High`;
    } else if (source === "Notion") {
      content = `Meeting Notes: ${topic}. Attendees from ${dept}. Action items included.`;
    } else if (source === "Gmail") {
      content = `Subject: Re: ${topic}\n\nHi Team,\n\nPlease review the attached document regarding ${topic}.\n\nBest,\n${dept} Lead`;
    } else {
      content = `Customer interaction log regarding ${topic}. Sentiment: Positive. Handover to ${dept}.`;
    }

    documents.push({
      text: content,
      stored_text: content,
      source,
      department: dept,
      topic,
      timestamp: Math.floor(Date.now() / 1000),
      doc_id: crypto.randomUUID(),
    });
  }
  return documents;
}

async function main() {
  console.log("🍚 RiceDB Bulk Ingest Example (HDC)\n");
  const client = new RiceDBClient(HOST, "auto", PORT);

  try {
    console.log(`1️⃣  Connecting to ${HOST}:${PORT}...`);
    await client.connect();
    console.log(`   ✓ Connected`);

    console.log("   🔑 Logging in...");
    await client.login("admin", PASSWORD);
    console.log("   ✓ Logged in successfully");

    console.log("\n2️⃣  Generating Data...");
    const rawDocs = generateCorpus(TOTAL_DOCS);
    console.log(`   ✓ Generated ${rawDocs.length} documents`);

    console.log(`\n3️⃣  Starting Bulk Ingest (Batch Size: ${BATCH_SIZE})...`);
    const startTime = Date.now();
    let totalInserted = 0;

    for (let i = 0; i < rawDocs.length; i += BATCH_SIZE) {
      const batch = rawDocs.slice(i, i + BATCH_SIZE);
      const batchDocs = batch.map((doc, j) => ({
        id: 1_000_000 + totalInserted + j,
        text: doc.text,
        metadata: { ...doc, text: undefined }, // Exclude text from metadata if passing separately
        userId: 1,
      }));

      try {
        const result = await client.batchInsert(batchDocs);
        const count = result.count;
        totalInserted += count;
        console.log(
          `   ✓ Batch ${
            Math.floor(i / BATCH_SIZE) + 1
          }: Inserted ${count} docs (Total: ${totalInserted})`
        );
      } catch (e) {
        console.log(
          `   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${e}`
        );
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Ingest Complete!`);
    console.log(`   Total Documents: ${totalInserted}`);
    console.log(`   Time Taken: ${duration.toFixed(2)}s`);
    console.log(`   Rate: ${(totalInserted / duration).toFixed(2)} docs/sec`);

    console.log("\n4️⃣  Verifying with Search...");
    const query = "server outage";
    console.log(`   Query: '${query}'`);

    const searchStart = Date.now();
    const results = await client.search(query, 1, 3);
    const searchDuration = (Date.now() - searchStart) / 1000;
    console.log(`   Search took ${searchDuration.toFixed(4)}s`);

    results.forEach((res, i) => {
      const meta = res.metadata;
      const textPreview = (meta.stored_text || "").substring(0, 80);
      console.log(
        `   ${i + 1}. [${meta.source || "Unknown"}] ${textPreview}... (Score: ${
          res.similarity
        })`
      );
    });
  } catch (e) {
    console.error("Error:", e);
  } finally {
    client.disconnect();
  }
}

main();
