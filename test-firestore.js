import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({ projectId: "fifth-garden-dp497" });
const db = getFirestore(app, "ai-studio-5b4e446b-e5e4-4c6a-8340-1751621c8923");

async function run() {
  try {
    const res = await db.collection("test").limit(1).get();
    console.log("Success:", res.size);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
