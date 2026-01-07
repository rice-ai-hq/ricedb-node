import { RiceDBClient } from "../src";

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "50051");
const PASSWORD = process.env.PASSWORD || "admin";

async function main() {
  console.log("==================================================");
  console.log(" Multi-User ACL Demo for RiceDB");
  console.log("==================================================");

  const adminClient = new RiceDBClient(HOST, "auto", PORT);
  try {
    await adminClient.connect();
    await adminClient.login("admin", PASSWORD);
    console.log(" Logged in as Admin");

    const usersConfig = {
      alice: { role: "user", dept: "Finance", pass: "alice123" },
      bob: { role: "user", dept: "Engineering", pass: "bob123" },
      charlie: { role: "user", dept: "Finance", pass: "charlie123" },
      diana: { role: "user", dept: "Engineering", pass: "diana123" },
    };

    const userClients: { [key: string]: RiceDBClient } = {};
    const users: { [key: string]: { id: number | string } } = {};

    console.log("\n==================================================");
    console.log(" 1. User Management");
    console.log("==================================================");

    for (const [name, info] of Object.entries(usersConfig)) {
      console.log(`  Creating user '${name}'...`);
      try {
        // Cleanup if exists
        try {
          await adminClient.deleteUser(name);
        } catch (e) {}

        const userId = await adminClient.createUser(name, info.pass, info.role);
        users[name] = { id: userId.toString() };
        console.log(` Created ${name} (ID: ${userId})`);

        const client = new RiceDBClient(HOST, "auto", PORT);
        await client.connect();
        await client.login(name, info.pass);
        userClients[name] = client;
      } catch (e) {
        console.error(` Failed to create/login ${name}: ${e}`);
      }
    }

    console.log("\n==================================================");
    console.log(" 2. Creating Documents");
    console.log("==================================================");

    const aliceClient = userClients["alice"];
    console.log("\nAlice inserting Q4 Budget Report...");

    await aliceClient.insert(
      1001,
      "Q4 2023 Budget Report - Financial analysis and projections",
      {
        title: "Q4 2023 Budget Report",
        type: "Financial Report",
        department: "Finance",
        sensitive: true,
      }
    );

    // Alice grants read to Charlie
    await aliceClient.grantPermission(1001, users["charlie"].id, {
      read: true,
      write: false,
      delete: false,
    });
    console.log(" Document inserted and shared with Charlie");

    const bobClient = userClients["bob"];
    console.log("\nBob inserting API Documentation...");
    await bobClient.insert(
      2001,
      "API v2 Documentation - Endpoints and schemas",
      {
        title: "API v2 Documentation",
        type: "Technical Documentation",
        department: "Engineering",
      }
    );

    // Bob grants read to Diana
    await bobClient.grantPermission(2001, users["diana"].id, {
      read: true,
      write: false,
      delete: false,
    });
    console.log(" Document inserted and shared with Diana");

    console.log("\n==================================================");
    console.log(" 3. Testing Permissions");
    console.log("==================================================");

    const charlieClient = userClients["charlie"];
    console.log("  Charlie searching for reports...");
    const resultsCharlie = await charlieClient.search(
      "budget report",
      users["charlie"].id,
      10
    );
    const foundCharlie = resultsCharlie.some((r) => r.id.toString() === "1001");
    if (foundCharlie) {
      console.log(" Charlie found the Budget Report");
    } else {
      console.log(" Charlie could NOT find the Budget Report");
    }

    console.log("  Bob searching for reports (Should fail)...");
    const resultsBob = await bobClient.search(
      "budget report",
      users["bob"].id,
      10
    );
    const foundBob = resultsBob.some((r) => r.id.toString() === "1001");
    if (!foundBob) {
      console.log(" Bob could NOT find the Budget Report (Correct)");
    } else {
      console.log(" Bob found the Budget Report (Unexpected)");
    }

    console.log("\n==================================================");
    console.log(" 4. Revoking Permissions");
    console.log("==================================================");

    console.log("  Alice revoking Charlie's access...");
    await aliceClient.revokePermission(1001, users["charlie"].id);

    const resultsCharlie2 = await charlieClient.search(
      "budget report",
      users["charlie"].id,
      10
    );
    const foundCharlie2 = resultsCharlie2.some(
      (r) => r.id.toString() === "1001"
    );
    if (!foundCharlie2) {
      console.log(" Charlie can no longer see the report");
    } else {
      console.log(" Charlie can still see the report");
    }

    console.log("\n==================================================");
    console.log(" 5. Summary");
    console.log("==================================================");
    console.log(" Multi-User ACL Demo completed successfully!");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    adminClient.disconnect();
    // Disconnect users
  }
}

main();
