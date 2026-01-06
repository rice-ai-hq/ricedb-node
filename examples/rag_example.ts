import { RiceDBClient } from "../src";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";

// Simulated LLM Generation
async function generateAnswer(
  query: string,
  context: string[]
): Promise<string> {
  // In a real RAG system, you would send this to OpenAI/Anthropic/LocalLLM
  console.log(
    `\n🤖 LLM Prompt:\nQuestion: ${query}\nContext:\n${context.join("\n")}`
  );

  // Simple rule-based simulation for the demo
  if (query.includes("schedule"))
    return "The project schedule is tight, with Phase 1 due next week.";
  if (query.includes("budget")) return "The budget allocation is $50k for Q1.";
  return "I found some relevant information in the documents.";
}

async function main() {
  console.log("==================================================");
  console.log(" RiceDB RAG Pipeline Demo");
  console.log("==================================================");

  const client = new RiceDBClient(HOST, "auto", PORT);

  try {
    await client.connect();
    await client.login("admin", PASSWORD);
    console.log("✅ Connected & Authenticated");

    // 1. Ingest Knowledge Base
    console.log("\n1️⃣  Ingesting Knowledge Base...");

    // Use unique IDs to avoid collision with other tests
    const baseId = 5000;
    const knowledgeBase = [
      {
        id: baseId + 1,
        text: "Project Alpha Launch Schedule: Phase 1 starts Oct 1st. Phase 2 starts Nov 15th.",
        metadata: { source: "wiki", title: "Schedule" },
      },
      {
        id: baseId + 2,
        text: "Q1 Budget Allocation: $50,000 allocated for server infrastructure and $20,000 for marketing.",
        metadata: { source: "finance", title: "Budget" },
      },
      {
        id: baseId + 3,
        text: "Team Roles: Alice is Lead Dev. Bob is PM. Charlie is QA.",
        metadata: { source: "hr", title: "Team" },
      },
      {
        id: baseId + 4,
        text: "API Rate Limits: 1000 req/min for free tier. 10000 req/min for pro.",
        metadata: { source: "docs", title: "API" },
      },
    ];

    for (const doc of knowledgeBase) {
      // Store text in metadata explicitly for RAG context retrieval
      await client.insert(doc.id, doc.text, {
        ...doc.metadata,
        content: doc.text,
      });
      console.log(`   ✓ Ingested: ${doc.metadata.title}`);
    }

    // 2. RAG Flow
    console.log("\n2️⃣  Executing RAG Queries...");

    const queries = [
      "What is the schedule for Project Alpha?",
      "How much budget is for Q1?",
      "Who is the Lead Dev?",
    ];

    for (const query of queries) {
      console.log(`\n🔎 User Query: "${query}"`);

      // Retrieval
      const k = 2;
      const searchResults = await client.search(query, 1, k);
      console.log(`   Found ${searchResults.length} relevant documents.`);

      const context = searchResults.map((res) => {
        const content =
          res.metadata.content || res.metadata.text || "No text content";
        const title = res.metadata.title || "Unknown Source";
        return `[${title}] ${content}`;
      });

      console.log("   📚 Retrieved Context:");
      context.forEach((c) => console.log(`      - ${c}`));

      // Generation
      const answer = await generateAnswer(query, context);
      console.log(`\n💡 Generated Answer: "${answer}"`);
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    client.disconnect();
  }
}

main();
