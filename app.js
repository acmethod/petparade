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
//  ADMIN SETTINGS
// ===============================

// Replace with your email to unlock admin controls
const ADMIN_EMAIL = "andre@feelslikehome.com";

function isAdmin() {
  const params = new URLSearchParams(window.location.search);
  return params.get("admin") === "1";
}

if (isAdmin()) {
  document.body.classList.add("admin-mode");
}



// ===============================
//  Upload form handling
// ===============================

document.addEventListener("submit", (event) => {
  if (event.target && event.target.id === "uploadForm") {
    handleUpload(event);
  }
});

async function handleUpload(event) {
  event.preventDefault();

  const nameInput = document.getElementById("petName");
  const categoryInput = document.getElementById("category");
  const emailInput = document.getElementById("ownerEmail");
  const fileInput = document.getElementById("petImage");

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const email = emailInput.value.trim();
  const file = fileInput.files[0];

  if (!name || !category || !email || !file) {
    alert("Please fill in all fields and select an image.");
    return;
  }

  // Show spinner
  showUploadSpinner(true);

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
    approved: false,   // NEW
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

    event.target.reset();
    alert("Pet uploaded successfully!");

  } catch (error) {
    console.error("Error uploading pet:", error);
    alert("Something went wrong while uploading. Please try again.");
  }

  showUploadSpinner(false);
}


// ===============================
//  Upload Spinner
// ===============================

function showUploadSpinner(show) {
  let spinner = document.getElementById("uploadSpinner");

  if (!spinner) {
    spinner = document.createElement("div");
    spinner.id = "uploadSpinner";
    spinner.innerHTML = `
      <div class="spinner-overlay">
        <div class="spinner"></div>
      </div>
    `;
    document.body.appendChild(spinner);
  }

  spinner.style.display = show ? "flex" : "none";
}


// ===============================
//  Category Filter
// ===============================

document.addEventListener("change", (event) => {
  if (event.target.id === "filterCategory") {
    watchGallery(event.target.value);
  }
});


// ===============================
//  Gallery rendering (live updates)
// ===============================

function watchGallery(filterCategory = "All") {
  const mainEl = document.getElementById("main");
  if (!mainEl) return;

  db.collection("pets")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      mainEl.innerHTML = "";

      const section = document.createElement("section");
      section.className = "thumbnails";

      snapshot.forEach((doc) => {
        const pet = doc.data();
        const id = doc.id;

        if (filterCategory !== "All" && pet.category !== filterCategory) return;

        const wrapper = document.createElement("div");
        wrapper.className = "tile";

        const link = document.createElement("a");
        link.href = pet.imageUrl;
        link.className = "thumbnail";
        link.setAttribute("data-position", "center center");

        const img = document.createElement("img");
        img.src = pet.imageUrl;
        img.alt = pet.name;

        const tag = document.createElement("span");
        tag.className = "category-tag";
        tag.textContent = pet.category;

        const label = document.createElement("h3");
        label.textContent = pet.name;

        const likeBtn = document.createElement("button");
        likeBtn.className = "like-tile-btn";
        likeBtn.textContent = `❤️ ${pet.likes}`;
        likeBtn.setAttribute("data-id", id);

        likeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          likeBtn.classList.add("pulse");
          setTimeout(() => likeBtn.classList.remove("pulse"), 300);
          likeButtonHandler(e);
        });

        // ===============================
        //  ADMIN CONTROLS
        // ===============================
        if (isAdmin()) {
          const adminControls = document.createElement("div");
          adminControls.className = "admin-controls";

          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.className = "admin-edit";
          editBtn.onclick = () => editPet(id, pet);

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.className = "admin-delete";
          deleteBtn.onclick = () => deletePet(id);

          adminControls.appendChild(editBtn);
          adminControls.appendChild(deleteBtn);
          wrapper.appendChild(adminControls);
        }

        link.appendChild(img);
        link.appendChild(tag);
        link.appendChild(label);
        link.appendChild(likeBtn);
        wrapper.appendChild(link);
        section.appendChild(wrapper);
      });

      mainEl.appendChild(section);

      $('#main').poptrox({
        usePopupCaption: true,
        usePopupNav: true,
        overlayColor: '#000',
        overlayOpacity: 0.75
      });
    });
}


// ===============================
//  Like Handler
// ===============================

async function likeButtonHandler(event) {
  const id = event.currentTarget.getAttribute("data-id");
  if (!id) return;

  try {
    const ref = db.collection("pets").doc(id);
    await ref.update({
      likes: firebase.firestore.FieldValue.increment(1)
    });
  } catch (error) {
    console.error("Error updating likes:", error);
  }
}


// ===============================
//  Admin Edit + Delete
// ===============================

function editPet(id, pet) {
  const newName = prompt("New name:", pet.name);
  if (!newName) return;

  db.collection("pets").doc(id).update({ name: newName });
}

function deletePet(id) {
  if (!confirm("Delete this pet?")) return;
  db.collection("pets").doc(id).delete();
}


// Start gallery listener
watchGallery();