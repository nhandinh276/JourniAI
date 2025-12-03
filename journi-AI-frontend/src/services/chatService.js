// src/services/chatService.js
import {
    collection,
    addDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// subcollection: itineraries/{tripId}/chats

export const getChatMessages = async (tripId) => {
    const chatsCol = collection(db, "itineraries", tripId, "chats");
    const q = query(chatsCol, orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addChatMessage = async (tripId, message) => {
    const chatsCol = collection(db, "itineraries", tripId, "chats");
    const docRef = await addDoc(chatsCol, {
        ...message,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};
