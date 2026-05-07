// Shared Firebase initialization. Every page imports `auth` and `db`
// from here so the config (and the SDK URLs) live in one place.
//
// If a page needs something extra (Analytics, secondary app, etc.),
// import `app` or `firebaseConfig` and wire it up locally.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyAKYoUaxhOX1pagezUTTDbwWVg5ktcSEcY",
    authDomain: "templatemaster-a2d6e.firebaseapp.com",
    projectId: "templatemaster-a2d6e",
    storageBucket: "templatemaster-a2d6e.firebasestorage.app",
    messagingSenderId: "208432538664",
    appId: "1:208432538664:web:10a29a55efbb824ae1411d",
    measurementId: "G-LLVT6XW024",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
