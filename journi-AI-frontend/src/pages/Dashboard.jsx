// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import TripMap from "../components/TripMap";
import {
    getTripsForUser,
    createTrip,
    deleteTrip as deleteTripService,
} from "../services/tripService";
import { FaPlus, FaTrash, FaEye } from "react-icons/fa";

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    // form tạo chuyến đi
    const [tripName, setTripName] = useState("");
    const [destination, setDestination] = useState("");

    // map
    const [selectedLocation, setSelectedLocation] = useState("Vietnam");

    useEffect(() => {
        // KHÔNG redirect về /login nữa, để ProtectedRoute/AuthContext xử lý.
        const u = auth.currentUser;
        setUser(u || null);

        if (!u) {
            setLoading(false);
            setTrips([]);
            return;
        }

        const loadTrips = async () => {
            try {
                const data = await getTripsForUser(u.uid);
                setTrips(data);
            } catch (err) {
                console.error("Load trips error", err);
            } finally {
                setLoading(false);
            }
        };
        loadTrips();
    }, []);

    const handleCreateTrip = async () => {
        if (!tripName.trim() || !user) return;

        try {
            const newTrip = await createTrip(user.uid, tripName.trim(), destination);
            setTrips((prev) => [...prev, newTrip]);

            // đưa map tới điểm đến mới
            if (destination) {
                setSelectedLocation(destination);
            }

            setTripName("");
            setDestination("");
        } catch (err) {
            console.error("Create trip error", err);
        }
    };

    const handleDeleteTrip = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xoá chuyến đi này?")) return;
        try {
            await deleteTripService(id);
            setTrips((prev) => prev.filter((t) => t.id !== id));
        } catch (err) {
            console.error("Delete trip error", err);
        }
    };

    const handleOpenTrip = (id) => {
        navigate(`/itinerary/${id}`);
    };

    const handleHoverTrip = (trip) => {
        if (trip.destination) {
            setSelectedLocation(trip.destination);
        } else {
            setSelectedLocation(trip.name);
        }
    };

    return (
        <div className="mt-4">
            {/* Hàng trên: Map + form tạo chuyến đi */}
            <div className="row">
                <div className="col-lg-8">
                    <TripMap location={selectedLocation} />
                </div>

                <div className="col-lg-4">
                    <div
                        className="card shadow-sm rounded-4 border-0 mb-4"
                        style={{ backgroundColor: "#fff3e0" }}
                    >
                        <div className="card-body">
                            <h4 className="text-primary fw-bold mb-3">
                                ✈️ Tạo chuyến đi mới
                            </h4>
                            <div className="mb-2">
                                <label className="form-label">Tên chuyến đi</label>
                                <input
                                    type="text"
                                    className="form-control rounded-pill px-3"
                                    placeholder="Ví dụ: Hành trình Huế mộng mơ"
                                    value={tripName}
                                    onChange={(e) => setTripName(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Điểm đến chính</label>
                                <input
                                    type="text"
                                    className="form-control rounded-pill px-3"
                                    placeholder="Ví dụ: Huế, Đà Nẵng, Đà Lạt..."
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                />
                                <small className="text-muted">
                                    Google Map sẽ tự zoom tới địa điểm này khi tạo chuyến đi.
                                </small>
                            </div>
                            <button
                                className="btn btn-primary w-100 rounded-pill fw-bold d-flex justify-content-center align-items-center"
                                onClick={handleCreateTrip}
                            >
                                <FaPlus className="me-2" /> Tạo chuyến đi
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danh sách chuyến đi */}
            <h4 className="mb-3 fw-bold text-success">Danh sách chuyến đi của bạn</h4>
            {loading && <p>Đang tải...</p>}

            {!loading && trips.length === 0 && (
                <p className="text-muted small mb-2">
                    Bạn chưa có chuyến đi nào. Hãy tạo chuyến đi đầu tiên bằng form bên
                    phải nhé!
                </p>
            )}

            <div className="row">
                {trips.map((trip) => {
                    const isDraft = !trip.meta || !trip.meta?.descriptionText;
                    const daysCount =
                        trip.daysCount || (trip.days ? trip.days.length : 0);
                    const totalCost = trip.totalCost || 0;

                    return (
                        <div
                            key={trip.id}
                            className="col-md-6 col-lg-4 mb-4"
                            onMouseEnter={() => handleHoverTrip(trip)}
                        >
                            <div
                                className="card shadow-sm rounded-4 border-0 h-100"
                                style={{ backgroundColor: isDraft ? "#e0f7fa" : "#fff" }}
                            >
                                <div className="card-body d-flex flex-column">
                                    <h5 className="card-title fw-bold mb-2">
                                        {trip.name}{" "}
                                        {trip.destination && (
                                            <span className="badge bg-info ms-1">
                                                {trip.destination}
                                            </span>
                                        )}
                                    </h5>

                                    {isDraft ? (
                                        <>
                                            <p className="text-muted mb-3">
                                                Chuyến đi mới tạo, chưa có mô tả chi tiết. Bấm{" "}
                                                <strong>Tạo hành trình</strong> để mô tả và cho AI lập
                                                lịch.
                                            </p>
                                            <div className="mt-auto d-flex gap-2 flex-wrap">
                                                <button
                                                    className="btn btn-outline-primary btn-sm fw-bold"
                                                    onClick={() => handleOpenTrip(trip.id)}
                                                >
                                                    Tạo hành trình
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm fw-bold"
                                                    onClick={() => handleDeleteTrip(trip.id)}
                                                >
                                                    <FaTrash className="me-1" />
                                                    Xóa
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="mb-1">
                                                <strong>Số ngày:</strong> {daysCount}
                                            </p>
                                            <p className="mb-1">
                                                <strong>Tổng chi phí ước tính:</strong>{" "}
                                                {totalCost > 0
                                                    ? totalCost.toLocaleString("vi-VN") + " đ"
                                                    : "Chưa có"}
                                            </p>
                                            <p className="text-muted small mb-3">
                                                {trip.meta?.shortSummary ||
                                                    "Hành trình đã được AI tối ưu. Bấm xem chi tiết để chỉnh sửa."}
                                            </p>
                                            <div className="mt-auto d-flex gap-2 flex-wrap">
                                                <button
                                                    className="btn btn-outline-primary btn-sm fw-bold d-flex align-items-center"
                                                    onClick={() => handleOpenTrip(trip.id)}
                                                >
                                                    <FaEye className="me-1" />
                                                    Xem chi tiết
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm fw-bold"
                                                    onClick={() => handleDeleteTrip(trip.id)}
                                                >
                                                    <FaTrash className="me-1" />
                                                    Xóa
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dashboard;
