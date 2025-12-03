// src/services/placeService.js
import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const placesCol = collection(db, "places");

export const getPlaces = async () => {
    const snap = await getDocs(placesCol);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addPlace = async (place) => {
    const docRef = await addDoc(placesCol, place);
    return { id: docRef.id, ...place };
};

export const removePlace = async (id) => {
    const ref = doc(db, "places", id);
    await deleteDoc(ref);
};
