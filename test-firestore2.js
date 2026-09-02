import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp({ projectId: config.projectId });
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    const res = await db.collection("test").limit(1).get();
    console.log("Success with databaseId:", res.size);
  } catch (e) {
    console.error("Error with databaseId:", e.message);
  }
}
run();
