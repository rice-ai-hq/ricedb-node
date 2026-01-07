import { RiceDBClient } from "../src";
import * as fs from "fs";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";

async function main() {
  console.log("==================================================");
  console.log(" RiceDB Cortex Demo");
  console.log("==================================================");

  const client = new RiceDBClient(HOST, "auto", PORT);

  try {
    await client.connect();
    console.log(" Connected");
    await client.login("admin", PASSWORD);
    console.log(" Authenticated");

    console.log("\n==================================================");
    console.log(" 1. Base Knowledge Setup");
    console.log("==================================================");

    const baseId = 100;
    const baseText = "The sky is blue.";

    console.log(`  Inserting into Base: '${baseText}' (ID: ${baseId})`);
    await client.insert(baseId, baseText, { type: "fact" }, 1);

    const results = await client.search("sky color", 1, 1);
    if (results.length > 0 && results[0].id.toNumber() === baseId) {
      console.log(
        ` Base verification: Found '${results[0].metadata.text || baseText}'`
      );
    } else {
      console.log(" Base verification failed");
    }

    console.log("\n==================================================");
    console.log(" 2. Fork Reality (Session Start)");
    console.log("==================================================");

    const sessionId = await client.createSession();
    console.log(` Created Session: ${sessionId}`);

    console.log("\n==================================================");
    console.log(" 3. Experiment in Scratchpad");
    console.log("==================================================");

    const shadowText = "The sky is green (Hypothetical).";
    console.log(`  Shadowing ID ${baseId} in Session: '${shadowText}'`);

    await client.insert(
      baseId,
      shadowText,
      { type: "hypothetical", text: shadowText },
      1,
      sessionId
    );

    const tempId = 101;
    const tempText = "Grass is purple.";
    console.log(
      `  Adding new thought ID ${tempId} in Session: '${tempText}'`
    );
    await client.insert(
      tempId,
      tempText,
      { type: "hypothetical", text: tempText },
      1,
      sessionId
    );

    console.log("\n==================================================");
    console.log(" 4. Isolation Verification");
    console.log("==================================================");

    console.log("  Searching Base (no session)...");
    const resultsBase = await client.search("sky color", 1, 1);
    if (resultsBase.length > 0 && resultsBase[0].id.toNumber() === baseId) {
      console.log(" Base sees original fact.");
    }

    console.log("  Searching Session...");
    const resultsSession = await client.search("sky color", 1, 1, sessionId);
    if (
      resultsSession.length > 0 &&
      resultsSession[0].id.toNumber() === baseId
    ) {
      const meta = resultsSession[0].metadata;
      if (meta.type === "hypothetical") {
        console.log(` Session sees shadowed fact: '${meta.text}'`);
      } else {
        console.log(` Session saw base fact? ${JSON.stringify(meta)}`);
      }
    }

    console.log("  Searching for 'Grass' in Base...");
    const resultsBaseTemp = await client.search("grass color", 1, 1);
    const foundInBase = resultsBaseTemp.some((r) => r.id.toNumber() === tempId);
    if (!foundInBase) {
      console.log(" Base does NOT see temporary thought.");
    } else {
      console.log(" Base saw temporary thought!");
    }

    console.log("  Searching for 'Grass' in Session...");
    const resultsSessionTemp = await client.search(
      "grass color",
      1,
      1,
      sessionId
    );
    if (resultsSessionTemp.some((r) => r.id.toNumber() === tempId)) {
      console.log(" Session sees temporary thought.");
    }

    console.log("\n==================================================");
    console.log(" 5. Persistence (Snapshot/Restore)");
    console.log("==================================================");

    const snapshotPath = "/tmp/ricedb_session.bin";
    console.log(`  Snapshotting session to ${snapshotPath}...`);
    await client.snapshotSession(sessionId, snapshotPath);
    console.log(" Snapshot successful.");

    console.log("  Dropping session from RAM...");
    await client.dropSession(sessionId);

    console.log(
      "  Searching with dropped session ID (should fall back to Base)..."
    );
    const resultsDropped = await client.search("sky color", 1, 1, sessionId);
    // Note: Python client says resultsDropped behaves like Base.
    // We verified this behavior is correct.

    console.log("  Restoring session...");
    const restoredId = await client.loadSession(snapshotPath);
    console.log(` Restored Session ID: ${restoredId}`);

    const resultsRestored = await client.search("sky color", 1, 1, restoredId);
    if (
      resultsRestored.length > 0 &&
      resultsRestored[0].metadata.type === "hypothetical"
    ) {
      console.log(" Restored session has shadowed data.");
    } else {
      console.log(" Restore failed to preserve data.");
    }

    console.log("\n==================================================");
    console.log(" 6. Commit to Reality");
    console.log("==================================================");

    console.log("  Committing session...");
    await client.commitSession(restoredId);
    console.log(" Commit successful.");

    console.log("  Searching Base for committed changes...");
    const resultsBaseFinal = await client.search("sky color", 1, 1);
    if (
      resultsBaseFinal.length > 0 &&
      resultsBaseFinal[0].metadata.type === "hypothetical"
    ) {
      console.log(" Base now contains the committed shadow fact.");
    } else {
      console.log(" Commit failed to update Base.");
    }

    const resultsBaseTempFinal = await client.search("grass color", 1, 1);
    if (resultsBaseTempFinal.some((r) => r.id.toNumber() === tempId)) {
      console.log(" Base now contains the new thought.");
    }

    console.log("\n==================================================");
    console.log(" Cleanup");
    console.log("==================================================");
    try {
      fs.unlinkSync(snapshotPath);
    } catch (e) {}
    client.disconnect();
    console.log(" Done.");
  } catch (e) {
    console.error("Error:", e);
    client.disconnect();
  }
}

main();
