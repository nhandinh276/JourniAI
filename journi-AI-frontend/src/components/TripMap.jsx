// src/components/TripMap.jsx
import React from "react";

const TripMap = ({ location }) => {
    // nếu chưa có location thì zoom Việt Nam
    const query = location && location.trim() ? location : "Vietnam";
    const src = `https://www.google.com/maps?q=${encodeURIComponent(
        query
    )}&output=embed`;

    return (
        <div className="card shadow-sm rounded-4 border-0 mb-4">
            <div className="card-body p-0" style={{ height: "350px" }}>
                <iframe
                    title="TripMap"
                    src={src}
                    style={{ border: 0, width: "100%", height: "100%", borderRadius: 16 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
            </div>
        </div>
    );
};

export default TripMap;
