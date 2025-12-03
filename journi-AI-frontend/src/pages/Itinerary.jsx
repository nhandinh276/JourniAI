// src/pages/Itinerary.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaEdit, FaTrash } from "react-icons/fa";
import ChatAI from "../components/ChatAI";
import {
    getTripById,
    saveTrip,
    deleteTrip,
    generateItineraryAI,
} from "../services/tripService";

const Itinerary = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [loadingTrip, setLoadingTrip] = useState(true);

    // form mô tả chuyến đi
    const [form, setForm] = useState({
        numDays: 3,
        budget: "",
        preference: "",
        reason: "",
        overview: "",
    });

    // danh sách các lịch trình AI đã tạo
    const [plans, setPlans] = useState([]); // {id, title, totalCost, shortSummary, days, formSnapshot, collapsed}
    const [loadingAI, setLoadingAI] = useState(false);
    const [rewriting, setRewriting] = useState(false);

    // hiển thị form mô tả hay không
    const [showForm, setShowForm] = useState(true);
    const [showPlans, setShowPlans] = useState(false);

    // chọn địa điểm cho Trợ lý AI
    const [selectedPlaceForAI, setSelectedPlaceForAI] = useState(null);

    // modal chi tiết địa điểm (double-click)
    const [detailPlace, setDetailPlace] = useState(null);

    // ================== helpers ==================
    const getPlacePhotoUrl = (placeName) => {
        const destination = trip?.destination || trip?.name || "";
        const query = encodeURIComponent(`${placeName} ${destination}`);
        // Unsplash random ảnh theo từ khoá, không cần API key
        return `https://source.unsplash.com/800x450/?${query}`;
    };

    // ================== Lấy dữ liệu chuyến đi từ Firestore ==================
    useEffect(() => {
        const fetchTrip = async () => {
            try {
                const t = await getTripById(id);
                setTrip(t);

                const meta = t?.meta || {};
                const baseNumDays = meta.numDays || t?.daysCount || 3;

                setForm({
                    numDays: baseNumDays,
                    budget: meta.budget || t?.budget || "",
                    preference: meta.preference || "",
                    reason: meta.reason || "",
                    overview: meta.overview || "",
                });

                let initialPlans = [];
                if (Array.isArray(t?.plans) && t.plans.length > 0) {
                    initialPlans = t.plans.map((p) => ({
                        id: p.id,
                        title: p.title,
                        totalCost: p.totalCost ?? null,
                        shortSummary: p.shortSummary || "",
                        days: p.days || [],
                        formSnapshot: p.formSnapshot || meta || null,
                        collapsed: !!p.collapsed,
                    }));
                } else if (Array.isArray(t?.days) && t.days.length > 0) {
                    initialPlans = [
                        {
                            id: "initial",
                            title:
                                meta.reason ||
                                `Hành trình ${t.destination || t.name || "mới"}`,
                            totalCost: t.totalCost ?? null,
                            shortSummary: t.shortSummary || "",
                            days: t.days,
                            formSnapshot: meta,
                            collapsed: false,
                        },
                    ];
                }

                setPlans(initialPlans);

                if (t?.status === "planned" && initialPlans.length > 0) {
                    setShowPlans(true);
                    setShowForm(false);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingTrip(false);
            }
        };

        fetchTrip();
    }, [id]);

    // ================== Xử lý form mô tả ==================
    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleRewriteOverview = async () => {
        if (!form.overview.trim()) {
            alert("Bạn cần nhập Mô tả tổng quan trước khi áp dụng AI.");
            return;
        }
        setRewriting(true);
        try {
            const res = await fetch(
                "http://localhost:5000/api/rewrite-description",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ description: form.overview }),
                }
            );
            if (!res.ok) throw new Error("rewrite failed " + res.status);
            const data = await res.json();
            if (data.text) {
                setForm((prev) => ({ ...prev, overview: data.text }));
            }
        } catch (err) {
            console.error(err);
            alert("Áp dụng AI thất bại, vui lòng thử lại.");
        } finally {
            setRewriting(false);
        }
    };

    // ================== Gọi AI tạo lịch trình ==================
    const handleGenerateByAI = async () => {
        if (!trip) return;

        setLoadingAI(true);
        try {
            const payload = {
                destination: trip.destination || trip.name || "",
                numDays: Number(form.numDays) || 3,
                budget: form.budget,
                preferences: form.preference,
                reason: form.reason,
                description: form.overview,
            };

            const result = await generateItineraryAI(payload);

            let { totalCost, shortSummary, days } = result || {};
            if (!Array.isArray(days)) {
                days = result?.days || [];
            }

            const title =
                form.reason?.trim() ||
                `Hành trình ${payload.destination || ""}`.trim() ||
                "Hành trình mới";

            const newPlan = {
                id: Date.now().toString(),
                title,
                totalCost: typeof totalCost === "number" ? totalCost : null,
                shortSummary: shortSummary || "",
                days: days || [],
                formSnapshot: { ...form },
                collapsed: false,
            };

            const collapsedPrev = plans.map((p) => ({ ...p, collapsed: true }));
            const nextPlans = [...collapsedPrev, newPlan];
            setPlans(nextPlans);

            setShowForm(false);
            setShowPlans(true);

            const updatedTrip = {
                ...trip,
                days: newPlan.days,
                totalCost: newPlan.totalCost,
                shortSummary: newPlan.shortSummary,
                meta: { ...form },
                plans: nextPlans.map((p) => ({
                    id: p.id,
                    title: p.title,
                    totalCost: p.totalCost,
                    shortSummary: p.shortSummary,
                    days: p.days,
                    formSnapshot: p.formSnapshot,
                    collapsed: p.collapsed,
                })),
                daysCount: Number(form.numDays) || 3,
                status: "planned",
            };

            setTrip(updatedTrip);
            await saveTrip(updatedTrip);
        } catch (err) {
            console.error("generate itinerary error", err);
            alert(
                "Tạo hành trình bằng AI thất bại. Kiểm tra lại backend/API key rồi thử lại nhé."
            );
        } finally {
            setLoadingAI(false);
        }
    };

    const handleSaveTrip = async () => {
        if (!trip) return;
        try {
            const updatedTrip = {
                ...trip,
                meta: { ...form },
                plans: plans.map((p) => ({
                    id: p.id,
                    title: p.title,
                    totalCost: p.totalCost,
                    shortSummary: p.shortSummary,
                    days: p.days,
                    formSnapshot: p.formSnapshot,
                    collapsed: p.collapsed,
                })),
                daysCount: Number(form.numDays) || 3,
            };
            setTrip(updatedTrip);
            await saveTrip(updatedTrip);
            alert("Đã lưu hành trình.");
        } catch (err) {
            console.error(err);
            alert("Lưu hành trình lỗi, thử lại sau.");
        }
    };

    const handleCreateAnotherPlan = () => {
        setPlans((prev) => prev.map((p) => ({ ...p, collapsed: true })));
        setShowPlans(true);
        setShowForm(true); // mở lại form để mô tả lịch trình mới
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const togglePlanVisibility = (planId) => {
        setPlans((prev) =>
            prev.map((p) =>
                p.id === planId ? { ...p, collapsed: !p.collapsed } : p
            )
        );
    };

    const handleEditDescriptionFromPlan = (planId) => {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) return;

        const snapshot =
            plan.formSnapshot || trip?.meta || {
                numDays: 3,
                budget: "",
                preference: "",
                reason: "",
                overview: "",
            };

        setForm({
            numDays: snapshot.numDays || 3,
            budget: snapshot.budget || "",
            preference: snapshot.preference || "",
            reason: snapshot.reason || "",
            overview: snapshot.overview || "",
        });

        setShowForm(true);
        setShowPlans(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // xoá 1 plan trong danh sách
    const handleDeletePlan = (planId) => {
        if (!window.confirm("Bạn có chắc muốn xoá lịch trình này?")) return;

        const remaining = plans.filter((p) => p.id !== planId);
        setPlans(remaining);

        if (remaining.length === 0) {
            // không còn plan nào
            const updatedTrip = {
                ...trip,
                days: [],
                totalCost: 0,
                shortSummary: "",
                plans: [],
                status: "draft",
            };
            setTrip(updatedTrip);
            saveTrip(updatedTrip);
        } else {
            const activePlan = remaining.find((p) => !p.collapsed) || remaining[0];
            const updatedTrip = {
                ...trip,
                days: activePlan.days || [],
                totalCost: activePlan.totalCost || 0,
                shortSummary: activePlan.shortSummary || "",
                plans: remaining.map((p) => ({
                    id: p.id,
                    title: p.title,
                    totalCost: p.totalCost,
                    shortSummary: p.shortSummary,
                    days: p.days,
                    formSnapshot: p.formSnapshot,
                    collapsed: p.collapsed,
                })),
            };
            setTrip(updatedTrip);
            saveTrip(updatedTrip);
        }
    };

    // xoá toàn bộ trip
    const handleDeleteTripAll = async () => {
        if (!trip) return;
        if (!window.confirm("Xoá toàn bộ hành trình này?")) return;
        try {
            await deleteTrip(trip.id);
            navigate("/");
        } catch (err) {
            console.error(err);
            alert("Xoá hành trình thất bại.");
        }
    };

    // chọn địa điểm cho Trợ lý AI (click 1 lần)
    const handlePlaceClick = (day, place) => {
        setSelectedPlaceForAI({
            targetPlaceName: place.name,
            targetDayNumber: day.dayNumber,
            text: `Ngày ${day.dayNumber} – ${place.name}`,
        });
    };

    // double-click: mở modal chi tiết
    const handlePlaceDoubleClick = (day, place) => {
        setDetailPlace({
            dayNumber: day.dayNumber,
            ...place,
        });
    };

    // ===== Thêm điểm gợi ý từ Trợ lý AI vào NGÀY ĐANG CHỌN =====
    const handleAddPlaceFromAI = async (suggestion) => {
        if (!trip) return;
        if (!selectedPlaceForAI || !selectedPlaceForAI.targetDayNumber) {
            alert(
                "Hãy chọn một địa điểm / ngày ở cột bên trái (Đang chọn cho Trợ lý AI) trước khi thêm gợi ý."
            );
            return;
        }

        const activePlan =
            plans.find((p) => !p.collapsed) || plans[plans.length - 1];
        if (!activePlan) return;

        const dayNumber = selectedPlaceForAI.targetDayNumber;

        // chuẩn hoá dữ liệu gợi ý
        const suggestionName =
            typeof suggestion === "string"
                ? suggestion
                : suggestion.name || "Gợi ý từ Trợ lý AI";

        const suggestionDesc =
            typeof suggestion === "object" && suggestion.description
                ? suggestion.description
                : `Gợi ý này được tạo từ yêu cầu bạn gửi cho Journi-bot ở ngày ${dayNumber}.`;

        const suggestionTime =
            typeof suggestion === "object" && suggestion.time
                ? suggestion.time
                : "";

        const suggestionCost =
            typeof suggestion === "object" && typeof suggestion.cost === "number"
                ? suggestion.cost
                : 0;

        // kiểm tra trùng trong ngày
        const currentDayInActive =
            (activePlan.days || []).find((d) => d.dayNumber === dayNumber) || null;

        if (
            currentDayInActive &&
            (currentDayInActive.places || []).some(
                (p) => p.isAiSuggestion && p.name === suggestionName
            )
        ) {
            alert(
                `Gợi ý "${suggestionName}" đã có trong ngày ${dayNumber}. Bạn thử chọn gợi ý khác nhé.`
            );
            return;
        }

        // tạo id ổn định cho place
        const newId =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : Date.now().toString() + Math.random().toString(16).slice(2);

        const newPlans = plans.map((p) => {
            if (p.id !== activePlan.id) return p;

            const days = [...(p.days || [])];
            let dayIndex = days.findIndex((d) => d.dayNumber === dayNumber);

            if (dayIndex === -1) {
                days.push({ dayNumber, places: [] });
                dayIndex = days.length - 1;
            }

            const targetDay = { ...(days[dayIndex] || { dayNumber, places: [] }) };
            const places = [...(targetDay.places || [])];

            const newPlace = {
                id: newId,
                name: suggestionName,
                description: suggestionDesc,
                time: suggestionTime,
                cost: suggestionCost,
                isAiSuggestion: true,
            };

            places.push(newPlace);
            targetDay.places = places;
            days[dayIndex] = targetDay;

            return { ...p, days };
        });

        setPlans(newPlans);

        const activeAfter =
            newPlans.find((p) => !p.collapsed) || newPlans[newPlans.length - 1];

        const updatedTrip = {
            ...trip,
            days: activeAfter?.days || [],
            plans: newPlans.map((p) => ({
                id: p.id,
                title: p.title,
                totalCost: p.totalCost,
                shortSummary: p.shortSummary,
                days: p.days,
                formSnapshot: p.formSnapshot,
                collapsed: p.collapsed,
            })),
        };

        setTrip(updatedTrip);
        await saveTrip(updatedTrip);
    };

    // Xoá 1 gợi ý AI trong ngày
    const handleDeleteAiSuggestion = async (planId, dayNumber, placeKey) => {
        if (!trip) return;

        const updatedPlans = plans.map((p) => {
            if (p.id !== planId) return p;

            const days = (p.days || []).map((d) => {
                if (d.dayNumber !== dayNumber) return d;

                return {
                    ...d,
                    places: (d.places || []).filter((pl) => {
                        if (!pl.isAiSuggestion) return true;
                        if (pl.id) {
                            return pl.id !== placeKey;
                        }
                        // fallback nếu place cũ chưa có id
                        return pl.name !== placeKey;
                    }),
                };
            });

            return { ...p, days };
        });

        setPlans(updatedPlans);

        const activeAfter =
            updatedPlans.find((p) => !p.collapsed) || updatedPlans[0];

        const newTrip = {
            ...trip,
            days: activeAfter?.days || [],
            plans: updatedPlans.map((p) => ({
                id: p.id,
                title: p.title,
                totalCost: p.totalCost,
                shortSummary: p.shortSummary,
                days: p.days,
                formSnapshot: p.formSnapshot,
                collapsed: p.collapsed,
            })),
        };

        setTrip(newTrip);
        await saveTrip(newTrip);
    };

    if (loadingTrip)
        return <p className="text-center mt-5">Đang tải dữ liệu...</p>;
    if (!trip)
        return <p className="text-center mt-5">Không tìm thấy hành trình.</p>;

    const destinationLabel = trip.destination || trip.name || "chuyến đi";
    const selectedContextLabel =
        typeof selectedPlaceForAI === "string"
            ? selectedPlaceForAI
            : selectedPlaceForAI?.text || "";

    return (
        <div className="container my-4 itinerary-page">
            <div className="row g-4">
                {/* ================== Cột trái ================== */}
                <div className="col-lg-8">
                    {/* Nút back + xoá hành trình */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <button
                            className="btn btn-link px-0"
                            type="button"
                            onClick={() => navigate("/")}
                        >
                            ← Về trang chính
                        </button>
                        <button
                            className="btn btn-outline-danger btn-sm"
                            type="button"
                            onClick={handleDeleteTripAll}
                        >
                            <FaTrash className="me-1" />
                            Xóa hành trình
                        </button>
                    </div>

                    {/* ----- FORM MÔ TẢ: chỉ hiện khi showForm = true ----- */}
                    {showForm && (
                        <div className="card shadow-sm border-0 itinerary-card mb-4">
                            <div className="card-body">
                                <h2
                                    className="mb-2"
                                    style={{ fontFamily: "Montserrat, sans-serif" }}
                                >
                                    {destinationLabel}
                                </h2>
                                <p className="text-muted mb-4">
                                    Bạn có thể <strong>không nhập</strong> phần “Mô tả tổng quan”
                                    để AI tự đề xuất theo số ngày, ngân sách, sở thích. Nếu{" "}
                                    <strong>có mô tả</strong>, AI sẽ ưu tiên các địa điểm phù hợp
                                    nhất với mô tả đó.
                                </p>

                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label">Số ngày</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-control"
                                            value={form.numDays}
                                            onChange={(e) =>
                                                handleChange("numDays", e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Ngân sách dự kiến</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            placeholder="VD: 2000000"
                                            value={form.budget}
                                            onChange={(e) =>
                                                handleChange("budget", e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Sở thích chính</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: ẩm thực, tham quan..."
                                            value={form.preference}
                                            onChange={(e) =>
                                                handleChange("preference", e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">
                                            Lý do / mục tiêu chuyến đi
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: du lịch cùng gia đình, phượt cùng bạn bè..."
                                            value={form.reason}
                                            onChange={(e) =>
                                                handleChange("reason", e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">
                                            Mô tả tổng quan (AI sẽ dựa vào đây để chia ngày – có thể
                                            để trống)
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            placeholder={`VD: Tôi muốn đến ${destinationLabel} trong ${form.numDays} ngày để tận hưởng ẩm thực địa phương...`}
                                            value={form.overview}
                                            onChange={(e) =>
                                                handleChange("overview", e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="d-flex flex-wrap gap-2 mt-4">
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        onClick={handleRewriteOverview}
                                        disabled={rewriting || !form.overview.trim()}
                                    >
                                        {rewriting
                                            ? "Đang áp dụng AI..."
                                            : "Áp dụng AI (mô tả dễ hiểu)"}
                                    </button>
                                    <button
                                        className="btn btn-primary px-4"
                                        onClick={handleGenerateByAI}
                                        disabled={loadingAI}
                                    >
                                        {loadingAI
                                            ? "Đang tạo hành trình..."
                                            : "Tạo hành trình bằng AI"}
                                    </button>
                                    <button
                                        className="btn btn-outline-success px-4"
                                        type="button"
                                        onClick={handleSaveTrip}
                                    >
                                        Lưu hành trình
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ----- LỊCH TRÌNH CHI TIẾT: chỉ hiện khi showPlans = true ----- */}
                    {showPlans && plans.length > 0 && (
                        <section className="mt-2">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h3 className="mb-0">🗺️ Lịch trình chi tiết</h3>
                                <button
                                    className="btn btn-outline-primary btn-sm"
                                    type="button"
                                    onClick={handleCreateAnotherPlan}
                                >
                                    + Tạo thêm lịch trình
                                </button>
                            </div>

                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className="card border-0 shadow-sm mb-3 plan-card"
                                >
                                    <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                                        <div>
                                            <h5 className="mb-1 text-capitalize">{plan.title}</h5>
                                            {plan.shortSummary && (
                                                <p className="mb-1 small text-muted">
                                                    {plan.shortSummary}
                                                </p>
                                            )}
                                            {typeof plan.totalCost === "number" && (
                                                <p className="mb-0 small text-muted">
                                                    Ước tính tổng chi phí:{" "}
                                                    <strong>
                                                        {plan.totalCost.toLocaleString("vi-VN")} đ
                                                    </strong>
                                                </p>
                                            )}
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                type="button"
                                                title={
                                                    plan.collapsed
                                                        ? "Hiện lịch trình"
                                                        : "Thu nhỏ lịch trình"
                                                }
                                                onClick={() => togglePlanVisibility(plan.id)}
                                            >
                                                {plan.collapsed ? <FaEye /> : <FaEyeSlash />}
                                            </button>
                                            <button
                                                className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                                type="button"
                                                onClick={() =>
                                                    handleEditDescriptionFromPlan(plan.id)
                                                }
                                            >
                                                <FaEdit className="me-1" /> Chỉnh sửa mô tả
                                            </button>
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                type="button"
                                                onClick={() => handleDeletePlan(plan.id)}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>

                                    {!plan.collapsed && (
                                        <div className="card-body">
                                            {!plan.days ||
                                                plan.days.length === 0 ||
                                                plan.days.every(
                                                    (d) => !d.places || d.places.length === 0
                                                ) ? (
                                                <p className="text-muted">
                                                    Lịch trình chưa có ngày nào. Hãy tạo bằng AI hoặc
                                                    thêm địa điểm từ Trợ lý AI.
                                                </p>
                                            ) : (
                                                plan.days
                                                    .filter((d) => d.places && d.places.length > 0)
                                                    .map((day) => (
                                                        <div key={day.dayNumber} className="mb-3">
                                                            <h6 className="fw-bold">
                                                                Ngày {day.dayNumber}
                                                            </h6>
                                                            {day.places.map((place) => {
                                                                const isActive =
                                                                    selectedPlaceForAI &&
                                                                    selectedPlaceForAI.targetPlaceName ===
                                                                    place.name &&
                                                                    selectedPlaceForAI.targetDayNumber ===
                                                                    day.dayNumber;

                                                                const isAi = place.isAiSuggestion;

                                                                return (
                                                                    <div
                                                                        key={place.id || place.name}
                                                                        className={
                                                                            "border rounded-3 p-2 mb-2 bg-white place-card " +
                                                                            (isActive ? "place-card-active " : "") +
                                                                            (isAi ? "place-card-ai " : "")
                                                                        }
                                                                        onClick={() =>
                                                                            handlePlaceClick(day, place)
                                                                        }
                                                                        onDoubleClick={() =>
                                                                            handlePlaceDoubleClick(day, place)
                                                                        }
                                                                    >
                                                                        <div className="d-flex justify-content-between align-items-start">
                                                                            <div>
                                                                                <div className="d-flex align-items-center gap-2">
                                                                                    <strong>{place.name}</strong>
                                                                                    {isAi && (
                                                                                        <span className="badge bg-info-subtle text-primary">
                                                                                            Gợi ý từ Trợ lý AI
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                {place.time && (
                                                                                    <span className="small text-muted">
                                                                                        {place.time}
                                                                                    </span>
                                                                                )}
                                                                                {isAi && (
                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn btn-link btn-sm text-danger p-0"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleDeleteAiSuggestion(
                                                                                                plan.id,
                                                                                                day.dayNumber,
                                                                                                place.id || place.name
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        Xóa
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {place.description && (
                                                                            <p className="mb-0 small">
                                                                                {place.description}
                                                                            </p>
                                                                        )}
                                                                        {typeof place.cost === "number" && (
                                                                            <p className="mb-0 small text-muted">
                                                                                Chi phí:{" "}
                                                                                {place.cost.toLocaleString("vi-VN")} đ
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </section>
                    )}
                </div>

                {/* ================== Cột phải: Trợ lý AI ================== */}
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 itinerary-card sticky-chat">
                        <div className="card-body d-flex flex-column chat-ai-root">
                            <ChatAI
                                onAddPlace={handleAddPlaceFromAI}
                                selectedContext={selectedPlaceForAI}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Modal chi tiết địa điểm (double click) ===== */}
            {detailPlace && (
                <div
                    className="custom-modal-backdrop"
                    onClick={() => setDetailPlace(null)}
                >
                    <div
                        className="custom-modal bg-white rounded-4 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="custom-modal-header">
                            <h5 className="custom-modal-title mb-0">
                                {detailPlace.name} (Ngày {detailPlace.dayNumber})
                            </h5>
                            <button
                                type="button"
                                className="btn btn-sm btn-light custom-modal-close"
                                onClick={() => setDetailPlace(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="custom-modal-body">
                            {detailPlace.name && (
                                <div className="place-map-wrapper mb-3">
                                    {/* Dùng Google Maps embed KHÔNG cần API key để tránh lỗi */}
                                    <iframe
                                        className="place-map-frame"
                                        src={`https://www.google.com/maps?q=${encodeURIComponent(
                                            detailPlace.name +
                                            " " +
                                            (trip.destination || trip.name || "")
                                        )}&output=embed`}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title={detailPlace.name}
                                    ></iframe>
                                </div>
                            )}

                            <p className="text-muted mb-2">
                                {trip.meta?.reason || trip.name} · Ngày {detailPlace.dayNumber}
                                <br />
                                ⏰ Thời gian:{" "}
                                <strong>{detailPlace.time || "Không rõ"}</strong> · 💰 Chi
                                phí ước tính:{" "}
                                <strong>
                                    {typeof detailPlace.cost === "number"
                                        ? detailPlace.cost.toLocaleString("vi-VN") + " đ"
                                        : "0 đ"}
                                </strong>
                            </p>

                            {detailPlace.description && (
                                <p className="mb-3">{detailPlace.description}</p>
                            )}

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <h6 className="fw-bold">Gợi ý trải nghiệm</h6>
                                    <p className="small mb-0">
                                        Thử chụp vài bức ảnh &quot;signature&quot;, nếm thử món
                                        đặc sản quanh khu vực và ghi lại cảm xúc trong JourniAI sau
                                        mỗi điểm dừng nhé.
                                    </p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="fw-bold">Tip nhỏ</h6>
                                    <p className="small mb-0">
                                        Nếu bạn thích nơi này, hãy dùng Trợ lý AI để hỏi thêm:{" "}
                                        <em>
                                            &quot;ngày {detailPlace.dayNumber}: gợi ý thêm địa điểm
                                            gần {detailPlace.name}&quot;
                                        </em>
                                        .
                                    </p>
                                </div>
                            </div>

                            <div className="text-end mt-3">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setDetailPlace(null)}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Itinerary;
