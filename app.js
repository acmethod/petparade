// ===============================
//  Firebase initialization
// ===============================

// Replace these values with your Firebase project's config
// (from Firebase console -> Project settings -> General -> Your apps)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// References to Firestore and Storage
const db = firebase.firestore();
const storage = firebase.storage();


// ===============================
//  Helpers
// ===============================

/**
 * Safely get an element by ID.
 */
function $(id) {
  return document.getElementById(id);
}


// ===============================
//  Upload form handling
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const uploadForm = $("uploadForm");

  if (uploadForm) {
    uploadForm.addEventListener("submit", handleUpload);
  }

  // Load existing pets on page load
  watchGallery();
});


async function handleUpload(event) {
  event.preventDefault();

  const nameInput = $("petName");
  const categoryInput = $("petCategory");
  const emailInput = $("ownerEmail");
  const fileInput = $("petImage");

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const email = emailInput.value.trim();
  const file = fileInput.files[0];

  if (!name || !category || !email || !file) {
    alert("Please fill in all fields and select an image.");
    return;
  }

  try {
    // Create a unique file path in Firebase Storage
    const filePath = `pets/${Date.now()}_${file.name}`;
    const storageRef = storage.ref().child(filePath);

    // Upload file
    const snapshot = await storageRef.put(file);
    const imageUrl = await snapshot.ref.getDownloadURL();

    // Save document in Firestore
    await db.collection("pets").add({
      name: name,
      category: category,
      email: email,
      imageUrl: imageUrl,
      likes: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reset form
    event.target.reset();

    alert("Pet uploaded successfully!");

  } catch (error) {
    console.error("Error uploading pet:", error);
    alert("Something went wrong while uploading. Please try again.");
  }
}


// ===============================
//  Gallery rendering (live updates)
// ===============================

/**
 * Listen for live changes in the "pets" collection and render them.
 */
function watchGallery() {
  const galleryEl = $("gallery");
  if (!galleryEl) return;

  db.collection("pets")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      // Clear current gallery
      galleryEl.innerHTML = "";

      snapshot.forEach((doc) => {
        const pet = doc.data();
        const id = doc.id;

        const likes = typeof pet.likes === "number" ? pet.likes : 0;
        const name = pet.name || "Unnamed";
        const category = pet.category || "";
        const imageUrl = pet.imageUrl || "";

        // Create article.thumb structure to match Multiverse
        const article = document.createElement("article");
        article.className = "thumb";

        article.innerHTML = `
          <a href="${imageUrl}" class="image">
            <img src="${imageUrl}" alt="${escapeHtml(name)}" />
          </a>
          <h2>${escapeHtml(name)}</h2>
          <p>${escapeHtml(category)}</p>
          <p class="likes">
            Likes: <span id="likes-${id}">${likes}</span>
          </p>
          <button class="button small like-button" data-id="${id}">
            ❤️ Like
          </button>
        `;

        galleryEl.appendChild(article);
      });

      // Attach like button handlers after rendering
      attachLikeHandlers();
    });
}

/**
 * Attach click listeners to all like buttons.
 */
function attachLikeHandlers() {
  const buttons = document.querySelectorAll(".like-button");
  buttons.forEach((btn) => {
    btn.removeEventListener("click", likeButtonHandler); // avoid duplicate handlers
    btn.addEventListener("click", likeButtonHandler);
  });
}

async function likeButtonHandler(event) {
  const id = event.currentTarget.getAttribute("data-id");
  if (!id) return;

  try {
    const ref = db.collection("pets").doc(id);

    // Increment likes atomically in Firestore
    await ref.update({
      likes: firebase.firestore.FieldValue.increment(1)
    });

    // Optimistically update UI
    const likesSpan = document.getElementById(`likes-${id}`);
    if (likesSpan) {
      const current = parseInt(likesSpan.textContent || "0", 10);
      likesSpan.textContent = current + 1;
    }

  } catch (error) {
    console.error("Error updating likes:", error);
    alert("Could not like this photo. Please try again.");
  }
}


// ===============================
//  Simple HTML escaping
// ===============================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}