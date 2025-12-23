// ===============================
//  Firebase initialization
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyB1bG1-emGOCRiTSHB0_WrFaGqLWVBSPl4",
  authDomain: "petparade-9b62f.firebaseapp.com",
  projectId: "petparade-9b62f",
  storageBucket: "petparade-9b62f.firebasestorage.app",
  messagingSenderId: "930397469356",
  appId: "1:930397469356:web:ffc46ae3cea0468a833d09"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();


// ===============================
//  Upload form handling
// ===============================

// Use delegated event listener so it works even if Multiverse replaces the form
document.addEventListener("submit", (event) => {
  if (event.target && event.target.id === "uploadForm") {
    handleUpload(event);
  }
});

async function handleUpload(event) {
  event.preventDefault();

  // Query inputs directly from the DOM (NOT from the form)
  const nameInput = document.getElementById("petName");
  const categoryInput = document.getElementById("petCategory");
  const emailInput = document.getElementById("ownerEmail");
  const fileInput = document.getElementById("petImage");

  console.log({ nameInput, categoryInput, emailInput, fileInput });

  if (!nameInput || !categoryInput || !emailInput || !fileInput) {
    console.error("One or more inputs not found in the live DOM");
    return;
  }

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const email = emailInput.value.trim();
  const file = fileInput.files[0];

  if (!name || !category || !email || !file) {
    alert("Please fill in all fields and select an image.");
    return;
  }

  try {
    const filePath = `pets/${Date.now()}_${file.name}`;
    const storageRef = storage.ref().child(filePath);

    const snapshot = await storageRef.put(file);
    const imageUrl = await snapshot.ref.getDownloadURL();

    await db.collection("pets").add({
      name,
      category,
      email,
      imageUrl,
      likes: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

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

function watchGallery() {
  const galleryEl = document.getElementById("gallery");
  if (!galleryEl) return;

  db.collection("pets")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      galleryEl.innerHTML = "";

      // Create Multiverse wrapper
      const section = document.createElement("section");
      section.className = "thumbnails";

      snapshot.forEach((doc) => {
        const pet = doc.data();
        const id = doc.id;

        const name = pet.name || "Unnamed";
        const category = pet.category || "";
        const imageUrl = pet.imageUrl || "";
        const likes = typeof pet.likes === "number" ? pet.likes : 0;

        // Multiverse tile structure
        const div = document.createElement("div");

        const link = document.createElement("a");
        link.href = imageUrl;
        link.className = "thumbnail";
        link.setAttribute("data-position", "center center");

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = escapeHtml(name);

        link.appendChild(img);
        div.appendChild(link);

        // Optional: add captions + likes under each tile
        const caption = document.createElement("div");
        caption.innerHTML = `
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(category)}</p>
          <p>Likes: <span id="likes-${id}">${likes}</span></p>
          <button class="button small like-button" data-id="${id}">❤️ Like</button>
        `;

        div.appendChild(caption);
        section.appendChild(div);
      });

      galleryEl.appendChild(section);

      // Reinitialize Multiverse lightbox/grid
      $('#main').poptrox({
        usePopupCaption: true,
        usePopupNav: true,
        overlayColor: '#000',
        overlayOpacity: 0.75
      });

      attachLikeHandlers();
    });
}

function attachLikeHandlers() {
  const buttons = document.querySelectorAll(".like-button");
  buttons.forEach((btn) => {
    btn.removeEventListener("click", likeButtonHandler);
    btn.addEventListener("click", likeButtonHandler);
  });
}

async function likeButtonHandler(event) {
  const id = event.currentTarget.getAttribute("data-id");
  if (!id) return;

  try {
    const ref = db.collection("pets").doc(id);

    await ref.update({
      likes: firebase.firestore.FieldValue.increment(1)
    });

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
//  HTML escaping
// ===============================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// Start gallery listener immediately
watchGallery();