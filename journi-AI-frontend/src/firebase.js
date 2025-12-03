// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBFidoFjzFYblvPc_r0smZbDqO1l8mI8bM",
    authDomain: "journi-ai-bac57.firebaseapp.com",
    projectId: "journi-ai-bac57",
    storageBucket: "journi-ai-bac57.firebasestorage.app",
    messagingSenderId: "536684044500",
    appId: "1:536684044500:web:5521a3e574349f7b829b41",
    measurementId: "G-JB8WGWVEGD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
