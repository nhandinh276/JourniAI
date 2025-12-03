// utils/fakeStorage.js

// USER
export const saveUser = (user, remember = false) => {
    if (remember) {
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        sessionStorage.setItem('user', JSON.stringify(user));
    }
}

export const getUser = () => {
    return JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));
}

export const logoutUser = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
}

// ITINERARY
export const saveTrips = (trips) => {
    localStorage.setItem('trips', JSON.stringify(trips));
}

export const getTrips = () => {
    return JSON.parse(localStorage.getItem('trips')) || [];
}

export const addTrip = (trip) => {
    const trips = getTrips();
    trips.push(trip);
    saveTrips(trips);
}

export const updateTrip = (updatedTrip) => {
    const trips = getTrips();
    const newTrips = trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
    saveTrips(newTrips);
}

export const deleteTrip = (tripId) => {
    const trips = getTrips();
    const newTrips = trips.filter(t => t.id !== tripId);
    saveTrips(newTrips);
}

// CHAT AI (nếu cần)
export const saveChat = (tripId, chatMessages) => {
    const allChats = JSON.parse(localStorage.getItem('chatHistory')) || {};
    allChats[tripId] = chatMessages;
    localStorage.setItem('chatHistory', JSON.stringify(allChats));
}

export const getChat = (tripId) => {
    const allChats = JSON.parse(localStorage.getItem('chatHistory')) || {};
    return allChats[tripId] || [];
}
