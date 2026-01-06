import { RiceDBClient } from "../src";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";

async function main() {
  console.log("==================================================");
  console.log(" RiceDB Agent Memory Demo");
  console.log("==================================================");

  const client = new RiceDBClient(HOST, "auto", PORT);

  try {
    await client.connect();
    console.log("Connected");
    await client.login("admin", PASSWORD);
    console.log("Authenticated as 'admin'");

    const sessionId = "code-review-101";

    console.log("\n==================================================");
    console.log(" 1. Initialization");
    console.log("==================================================");
    console.log(`Clearing memory for session: ${sessionId}`);
    await client.clearMemory(sessionId);
    console.log("Memory cleared");

    console.log("\n==================================================");
    console.log(" 2. Multi-Agent Interaction");
    console.log("==================================================");

    console.log("ScannerAgent is analyzing the codebase...");
    await client.addMemory(
      sessionId,
      "ScannerAgent",
      "Started static analysis on src/auth/mod.rs",
      { status: "in-progress", target: "src/auth/mod.rs" }
    );

    await new Promise((r) => setTimeout(r, 500));

    await client.addMemory(
      sessionId,
      "ScannerAgent",
      "Found potential hardcoded secret in login function.",
      { priority: "high", line: "42" }
    );
    console.log("ScannerAgent logged findings.");

    console.log(
      "ReviewerAgent is filtering memory for 'high' priority findings..."
    );

    const highPriorityFindings = await client.getMemory(sessionId, 50, 0, {
      priority: "high",
    });

    console.log(`\n[High Priority Findings: ${highPriorityFindings.length}]`);
    for (const entry of highPriorityFindings) {
      console.log(`  - [${entry.agentId}] ${entry.content}`);
    }

    if (highPriorityFindings.length > 0) {
      const lastEntry = highPriorityFindings[highPriorityFindings.length - 1];
      console.log("\nReviewerAgent noticed the issue.");
      await client.addMemory(
        sessionId,
        "ReviewerAgent",
        "I verified the finding. It is indeed a hardcoded string.",
        { verdict: "confirmed", refers_to: lastEntry.id },
        3600
      );
      console.log("ReviewerAgent added confirmation with 1h TTL.");
    }

    console.log("\n==================================================");
    console.log(" 3. Real-time Watch (Pub/Sub)");
    console.log("==================================================");
    console.log(
      "   (Skipping blocking watch in single-threaded demo. See docs for usage.)"
    );

    console.log("\n==================================================");
    console.log(" 4. Graph Knowledge");
    console.log("==================================================");

    try {
      await client.insert(
        101,
        "auth.ts authentication logic",
        { type: "file" },
        1
      );
      await client.insert(102, "login.ts user login page", { type: "file" }, 1);

      console.log("Linking auth.ts -> IMPORTS -> login.ts");
      await client.addEdge(102, 101, "IMPORTS");
      console.log("Link created.");

      const neighbors = await client.getNeighbors(102, "IMPORTS");
      // neighbors is Long[]
      console.log(
        `   Neighbors of login.ts (IMPORTS): ${neighbors.map((n) =>
          n.toString()
        )}`
      );
    } catch (e) {
      console.log(`   (Graph op failed: ${e})`);
    }

    console.log("\n==================================================");
    console.log(" Summary");
    console.log("==================================================");
    console.log(
      "The Agent Memory feature allows fast, lightweight coordination between agents"
    );
    console.log(
      "without the overhead of vector embeddings or polluting the main search index."
    );
  } catch (e) {
    console.error("Error:", e);
  } finally {
    client.disconnect();
  }
}

main();
