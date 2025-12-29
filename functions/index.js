// --- Firebase Functions v2 + Admin SDK ---
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

// --- Google Cloud Vision ---
const vision = require("@google-cloud/vision");

// --- Initialize Firebase Admin ---
initializeApp();
const db = getFirestore();
const storage = getStorage();
const client = new vision.ImageAnnotatorClient();

// --- NEW v2 Function Name (avoids the broken one) ---
exports.moderateImageV2 = onObjectFinalized(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const filePath = event.data.name;

    // Only moderate images in the pets/ folder
    if (!filePath || !filePath.startsWith("pets/")) return;

    const bucketName = event.data.bucket;
    const bucket = storage.bucket(bucketName);

    // Run SafeSearch
    const [result] = await client.safeSearchDetection(
      `gs://${bucketName}/${filePath}`
    );

    const safe = result.safeSearchAnnotation;

    const isSafe =
      safe.adult !== "LIKELY" &&
      safe.adult !== "VERY_LIKELY" &&
      safe.violence !== "LIKELY" &&
      safe.violence !== "VERY_LIKELY" &&
      safe.racy !== "LIKELY" &&
      safe.racy !== "VERY_LIKELY";

    // Extract Firestore doc ID from filename
    const docId = filePath.split("/").pop().split(".")[0];

    // Update Firestore
    await db.collection("pets").doc(docId).update({
      approved: isSafe,
      flagged: !isSafe,
      moderation: safe,
      moderatedAt: new Date(),
    });

    console.log(`Moderation complete for ${filePath}: safe=${isSafe}`);
  }
);