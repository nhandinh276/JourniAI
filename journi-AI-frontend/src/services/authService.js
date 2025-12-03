// src/services/authService.js
import { auth } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from "firebase/auth";

export const registerUser = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    if (displayName) {
        await updateProfile(cred.user, { displayName });
    }

    return cred.user;
};

export const loginUser = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
    return signOut(auth);
};
