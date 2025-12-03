// src/services/tripService.js
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const tripsCol = collection(db, "itineraries");

// =============== FIRESTORE ===============

// Tạo chuyến đi mới (draft)
export const createTrip = async (uid, name, destination = "") => {
    const docRef = await addDoc(tripsCol, {
        uid,                // user id
        name,
        destination,        // ví dụ: "Huế"
        createdAt: serverTimestamp(),
        days: [],
        meta: null,         // mô tả chi tiết chuyến đi
        totalCost: 0,
        daysCount: 0,
        shortSummary: "",
        status: "draft",    // "draft" | "planned"
        plans: [],          // danh sách các lịch trình AI đã tạo
    });
    return { id: docRef.id, uid, name, destination, days: [] };
};

// Lấy danh sách chuyến đi của 1 user
export const getTripsForUser = async (uid) => {
    const q = query(tripsCol, where("uid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Lấy chi tiết 1 trip
export const getTripById = async (id) => {
    const ref = doc(db, "itineraries", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
};

// Lưu cập nhật trip (days, meta, totalCost...)
export const saveTrip = async (trip) => {
    const { id, ...data } = trip;
    const ref = doc(db, "itineraries", id);
    await updateDoc(ref, data);
};

// Xoá trip
export const deleteTrip = async (id) => {
    const ref = doc(db, "itineraries", id);
    await deleteDoc(ref);
};

// =============== AI SERVICES ===============

// Gọi backend để tạo hành trình bằng AI
export const generateItineraryAI = async (payload) => {
    const res = await fetch("http://localhost:5000/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("generate-itinerary error:", res.status, text);
        throw new Error("generate-itinerary failed: " + res.status);
    }

    const data = await res.json();
    console.log("AI itinerary response:", data);
    return data; // { totalCost, shortSummary, days: [...] }
};

// (tuỳ chọn) nếu sau này muốn dùng từ service thay vì gọi trực tiếp
export const rewriteDescriptionAI = async (description) => {
    const res = await fetch("http://localhost:5000/api/rewrite-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("rewrite-description error:", res.status, text);
        throw new Error("rewrite-description failed: " + res.status);
    }

    return res.json(); // { text }
};
