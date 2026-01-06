import { RiceDBClient } from "../src";
import * as fs from "fs";
import * as path from "path";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";

async function main() {
  console.log("RiceDB LongMemEval Test\n");

  const client = new RiceDBClient(HOST, "auto", PORT);
  try {
    await client.connect();
    await client.login("admin", PASSWORD);
    console.log("Connected & Authenticated");

    const limit = 5;
    let count = 0;

    // Path relative to dist/examples/test_longmemeval.js
    const datasetPath = path.resolve(
      __dirname,
      "../../../datasets/longmemeval_s_cleaned.json"
    );

    if (!fs.existsSync(datasetPath)) {
      console.error(`Dataset file not found: ${datasetPath}`);
      console.error("   Current dir:", __dirname);
      return;
    }

    console.log(`   Reading dataset from: ${datasetPath}`);
    const data = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

    for (const item of data) {
      if (count >= limit) break;
      count++;

      const question = item.question;
      const answer = item.answer;
      const qId = item.question_id;
      const userId = 10000 + count;

      console.log(`\nTest Case ${count} (ID: ${qId})`);
      console.log(`   Question: ${question}`);
      console.log(`   Expected Answer: ${answer}`);

      const docs = [];
      let docIdCounter = 0;
      const expectedDocIds: number[] = [];

      if (item.haystack_sessions) {
        for (
          let sessionIdx = 0;
          sessionIdx < item.haystack_sessions.length;
          sessionIdx++
        ) {
          const session = item.haystack_sessions[sessionIdx];
          for (const msg of session) {
            const content = msg.content || "";
            if (content) {
              docIdCounter++;
              // Simple containment check
              if (
                answer &&
                content.toLowerCase().includes(answer.toLowerCase())
              ) {
                expectedDocIds.push(docIdCounter);
              }

              docs.push({
                id: docIdCounter,
                text: content,
                metadata: {
                  stored_text: content,
                  role: msg.role || "unknown",
                  session_idx: sessionIdx,
                },
                userId: userId,
              });
            }
          }
        }
      }

      console.log(`   Expected Answer Doc IDs: ${expectedDocIds.join(", ")}`);
      console.log(
        `   Ingesting ${docs.length} documents for user ${userId}...`
      );

      const startTime = Date.now();

      // Batch insert
      const CHUNK_SIZE = 100;
      let totalIngested = 0;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        try {
          await client.batchInsert(chunk, userId);
          totalIngested += chunk.length;
        } catch (e) {
          console.log(`   Batch failed: ${e}`);
        }
      }

      const ingestTime = (Date.now() - startTime) / 1000;
      const rate = ingestTime > 0 ? totalIngested / ingestTime : 0;
      console.log(
        `   ✓ Ingested ${totalIngested} docs in ${ingestTime.toFixed(
          2
        )}s (${rate.toFixed(1)} docs/sec)`
      );

      // Search
      console.log("   Searching...");
      const searchStart = Date.now();
      const results = await client.search(question, userId, 3);
      const searchTime = (Date.now() - searchStart) / 1000;

      console.log(
        `   ✓ Found ${results.length} results in ${searchTime.toFixed(4)}s`
      );

      results.forEach((res, i) => {
        const meta = res.metadata;
        const text = meta.stored_text || "";
        const role = meta.role || "?";
        const snippet = text.substring(0, 100).replace(/\n/g, " ");
        const score = res.similarity;
        const nodeId = res.id.toNumber();

        const isExpected = expectedDocIds.includes(nodeId);
        const marker = isExpected ? "[OK]" : "    ";

        console.log(
          `     ${
            i + 1
          }. ${marker} [${role}] ID: ${nodeId} - ${snippet}... (Score: ${score.toFixed(
            4
          )})`
        );

        if (answer && text.toLowerCase().includes(answer.toLowerCase())) {
          console.log(`        Text contains answer string!`);
        }
      });
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    client.disconnect();
  }
}

main();
