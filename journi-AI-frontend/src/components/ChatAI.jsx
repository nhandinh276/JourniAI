// src/components/ChatAI.jsx
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

const CHAT_API_URL = "http://localhost:5000/api/chat-itinerary";

const initialBotMessage =
    'Xin chào, mình là Journi-bot 🌈. Hãy kể cho mình nghe bạn muốn tìm gì: địa điểm tham quan, quán ăn, quán cà phê, chỗ chill, hay đặt khách sạn nhé!';

function ChatAI({ selectedContext, onAddPlace }) {
    const [mode, setMode] = useState("place"); // "place" | "hotel"
    const [messages, setMessages] = useState([
        { id: "bot-0", role: "bot", text: initialBotMessage },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const [suggestions, setSuggestions] = useState([]);
    const [hotelOptions, setHotelOptions] = useState([]);
    const [showHotelModal, setShowHotelModal] = useState(false);
    const [hotelForm, setHotelForm] = useState({
        hotelId: "",
        fullName: "",
        phone: "",
        email: "",
    });

    const messagesRef = useRef(null);

    const currentContextLabel =
        typeof selectedContext === "string"
            ? selectedContext
            : selectedContext?.text ||
            selectedContext?.targetPlaceName ||
            null;

    useEffect(() => {
        if (!messagesRef.current) return;
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages, suggestions, showHotelModal]);

    const handleReset = () => {
        setMessages([{ id: "bot-0", role: "bot", text: initialBotMessage }]);
        setSuggestions([]);
        setHotelOptions([]);
        setInput("");
    };

    const handleSaveChat = () => {
        try {
            const payload = {
                savedAt: new Date().toISOString(),
                mode,
                messages,
            };
            localStorage.setItem("journi_last_chat", JSON.stringify(payload));
            alert("Đã lưu cuộc trò chuyện của bạn.");
        } catch (e) {
            console.error(e);
            alert("Không lưu được cuộc trò chuyện, thử lại sau nhé.");
        }
    };

    const openHotelModal = () => {
        if (hotelOptions.length === 0) {
            const area = currentContextLabel || "khu vực bạn chọn";
            setHotelOptions([
                {
                    id: "h1",
                    name: `Khách sạn trung tâm gần ${area}`,
                    address: area,
                    description:
                        "Khách sạn 3* sạch sẽ, thuận tiện di chuyển tới các điểm tham quan.",
                    priceRange: "~800.000đ/đêm",
                    cost: 800000,
                },
                {
                    id: "h2",
                    name: `Homestay view đẹp ở ${area}`,
                    address: area,
                    description:
                        "Phong cách trẻ trung, phù hợp nhóm bạn, có không gian sinh hoạt chung.",
                    priceRange: "~600.000đ/đêm",
                    cost: 600000,
                },
                {
                    id: "h3",
                    name: `Khách sạn gia đình tại ${area}`,
                    address: area,
                    description:
                        "Phù hợp gia đình, có bữa sáng miễn phí và phòng rộng rãi.",
                    priceRange: "~1.000.000đ/đêm",
                    cost: 1000000,
                },
            ]);
        }
        setShowHotelModal(true);
    };

    const closeHotelModal = () => setShowHotelModal(false);

    const handleSend = async () => {
        const content = input.trim();
        if (!content || loading) return;

        const userMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            text: content,
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const payload = {
                message: content,
                mode,
                selectedContext,
            };

            const res = await fetch(CHAT_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            let data = null;
            try {
                data = await res.json();
            } catch (err) {
                console.warn("Không parse được JSON từ backend.");
            }

            const isHotelMode = mode === "hotel";

            const botText =
                data?.reply ||
                data?.text ||
                (isHotelMode
                    ? "Mình đã ghi lại nhu cầu đặt khách sạn của bạn. Bạn xem form đặt phòng mình gửi kèm bên dưới nhé."
                    : "Mình đã nhận được yêu cầu của bạn rồi, hãy thử áp dụng những gợi ý bên dưới nhé!");

            const botMessage = {
                id: `bot-${Date.now()}`,
                role: "bot",
                text: botText,
            };

            const newMessages = [...messages, userMessage, botMessage];

            if (isHotelMode) {
                newMessages.push({
                    id: `bot-form-${Date.now()}`,
                    role: "bot",
                    type: "hotelForm",
                    text: "Để tiện cho bạn, mình gửi kèm một form nhỏ để đặt khách sạn. Bấm vào nút bên dưới để mở form nhé.",
                });
            }

            setMessages(newMessages);

            if (!isHotelMode) {
                if (Array.isArray(data?.suggestions)) {
                    const normalized = data.suggestions.map((s, index) => ({
                        id: s.id || `sg-${Date.now()}-${index}`,
                        name: s.name || s.title || `Gợi ý #${index + 1}`,
                        description: s.description || s.summary || "",
                        time: s.time || "",
                        cost: typeof s.cost === "number" ? s.cost : 0,
                    }));
                    setSuggestions(normalized);
                }
            } else {
                const area = currentContextLabel || "khu vực bạn chọn";

                let hotels = [];
                if (Array.isArray(data?.hotels)) {
                    hotels = data.hotels.map((h, idx) => ({
                        id: h.id || `hotel-${Date.now()}-${idx}`,
                        name: h.name || h.title || `Khách sạn #${idx + 1}`,
                        address: h.address || area,
                        description: h.description || h.summary || "",
                        priceRange: h.priceRange || h.price || "",
                        cost:
                            typeof h.cost === "number"
                                ? h.cost
                                : typeof h.price === "number"
                                    ? h.price
                                    : 0,
                    }));
                }

                if (hotels.length === 0) {
                    hotels = [
                        {
                            id: "h1",
                            name: `Khách sạn trung tâm gần ${area}`,
                            address: area,
                            description:
                                "Khách sạn 3* sạch sẽ, thuận tiện di chuyển tới các điểm tham quan.",
                            priceRange: "~800.000đ/đêm",
                            cost: 800000,
                        },
                        {
                            id: "h2",
                            name: `Homestay view đẹp ở ${area}`,
                            address: area,
                            description:
                                "Phong cách trẻ trung, phù hợp nhóm bạn, có không gian sinh hoạt chung.",
                            priceRange: "~600.000đ/đêm",
                            cost: 600000,
                        },
                        {
                            id: "h3",
                            name: `Khách sạn gia đình tại ${area}`,
                            address: area,
                            description:
                                "Phù hợp gia đình, có bữa sáng miễn phí và phòng rộng rãi.",
                            priceRange: "~1.000.000đ/đêm",
                            cost: 1000000,
                        },
                    ];
                }

                setHotelOptions(hotels);
                setSuggestions([]);
            }
        } catch (err) {
            console.error("Lỗi gọi API chat:", err);
            const botMessage = {
                id: `bot-${Date.now()}`,
                role: "bot",
                text: "Xin lỗi, Journi-bot đang bị nghẽn mạng một chút. Bạn thử gửi lại sau vài giây nhé.",
            };
            setMessages((prev) => [...prev, botMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleAddSuggestionToPlan = (sug) => {
        if (onAddPlace) onAddPlace(sug);
    };

    const inputPlaceholder = currentContextLabel
        ? `VD: "gợi ý thêm khách sạn gần ${currentContextLabel}"` +
        (mode === "place"
            ? ""
            : " hoặc mô tả chi tiết: ngân sách, số người, view bạn mong muốn...")
        : mode === "place"
            ? 'VD: "gợi ý địa điểm ăn uống quanh Hồ Gươm"'
            : 'VD: "tôi cần khách sạn 2 người, budget 800k/đêm gần phố cổ"';

    const selectedHotel =
        hotelOptions.find((h) => h.id === hotelForm.hotelId) || null;

    const handleHotelFormChange = (field, value) => {
        setHotelForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmitHotelBooking = (e) => {
        e.preventDefault();
        if (!hotelForm.hotelId || !hotelForm.fullName || !hotelForm.phone) {
            alert("Vui lòng chọn khách sạn và điền đầy đủ họ tên, số điện thoại.");
            return;
        }
        alert(
            `Đặt khách sạn thành công!\n\nKhách sạn: ${selectedHotel?.name || ""
            }\nKhách: ${hotelForm.fullName}\nSĐT: ${hotelForm.phone}`
        );
        setShowHotelModal(false);
    };

    const HotelModal = showHotelModal
        ? ReactDOM.createPortal(
            <div className="hotel-modal-backdrop" onClick={closeHotelModal}>
                <div className="hotel-modal" onClick={(e) => e.stopPropagation()}>
                    <h5 className="mb-3">
                        Đặt khách sạn{" "}
                        {currentContextLabel ? `gần ${currentContextLabel}` : ""}
                    </h5>
                    <form onSubmit={handleSubmitHotelBooking}>
                        <div className="mb-3">
                            <label className="form-label">Chọn khách sạn</label>
                            <select
                                className="form-select"
                                value={hotelForm.hotelId}
                                onChange={(e) =>
                                    handleHotelFormChange("hotelId", e.target.value)
                                }
                            >
                                <option value="">-- Chọn khách sạn --</option>
                                {hotelOptions.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.name}
                                    </option>
                                ))}
                            </select>
                            {selectedHotel && (
                                <small className="text-muted d-block mt-1">
                                    {selectedHotel.address} · {selectedHotel.priceRange}
                                    {selectedHotel.description
                                        ? ` · ${selectedHotel.description}`
                                        : ""}
                                </small>
                            )}
                        </div>

                        <div className="mb-2">
                            <label className="form-label">Họ và tên</label>
                            <input
                                type="text"
                                className="form-control"
                                value={hotelForm.fullName}
                                onChange={(e) =>
                                    handleHotelFormChange("fullName", e.target.value)
                                }
                                placeholder="Nguyễn Văn A"
                            />
                        </div>

                        <div className="mb-2">
                            <label className="form-label">Số điện thoại</label>
                            <input
                                type="tel"
                                className="form-control"
                                value={hotelForm.phone}
                                onChange={(e) =>
                                    handleHotelFormChange("phone", e.target.value)
                                }
                                placeholder="0xxxxxxxxx"
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Email (tuỳ chọn)</label>
                            <input
                                type="email"
                                className="form-control"
                                value={hotelForm.email}
                                onChange={(e) =>
                                    handleHotelFormChange("email", e.target.value)
                                }
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={closeHotelModal}
                            >
                                Đóng
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Đặt khách sạn
                            </button>
                        </div>
                    </form>
                </div>
            </div>,
            document.body
        )
        : null;

    return (
        <>
            <div className="chat-ai-body">
                <div className="d-flex justify-content-between align-items-center chat-ai-header mb-2">
                    <div>
                        <h4 className="mb-0">Trợ lý AI</h4>
                        <small className="text-muted">
                            Journi-bot 🌈 · Trợ lý AI đồng hành cùng chuyến đi của bạn
                        </small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-light"
                            onClick={handleReset}
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary rounded-circle"
                            onClick={handleSaveChat}
                        >
                            Lưu
                            <br />
                            chat
                        </button>
                    </div>
                </div>

                <div className="d-flex gap-2 mb-3">
                    <button
                        type="button"
                        className={
                            "btn flex-fill " +
                            (mode === "place" ? "btn-primary" : "btn-outline-primary bg-white")
                        }
                        onClick={() => setMode("place")}
                    >
                        📍 Gợi ý địa điểm
                    </button>
                    <button
                        type="button"
                        className={
                            "btn flex-fill " +
                            (mode === "hotel" ? "btn-primary" : "btn-outline-primary bg-white")
                        }
                        onClick={() => setMode("hotel")}
                    >
                        🏨 Booking khách sạn
                    </button>
                </div>

                {currentContextLabel && (
                    <div className="chat-context-box mb-2">
                        <strong>Đang chọn cho Trợ lý AI:</strong> {currentContextLabel}
                    </div>
                )}

                <div ref={messagesRef} className="chat-ai-scroll-area mb-2">
                    <div className="chat-ai-messages">
                        {messages.map((m) => {
                            if (m.type === "hotelForm") {
                                return (
                                    <div
                                        key={m.id}
                                        className="chat-ai-message chat-ai-message-bot mb-1"
                                    >
                                        <div className="chat-ai-bubble">
                                            <div className="fw-semibold small mb-1">Journi-bot</div>
                                            <div className="chat-bubble-body small mb-2">{m.text}</div>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary"
                                                onClick={openHotelModal}
                                            >
                                                Mình gửi cho bạn cái form này
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={m.id}
                                    className={
                                        "chat-ai-message " +
                                        (m.role === "user"
                                            ? "chat-ai-message-user mb-1"
                                            : "chat-ai-message-bot mb-1")
                                    }
                                >
                                    <div className="chat-ai-bubble">
                                        <div className="fw-semibold small mb-1">
                                            {m.role === "user" ? "Bạn" : "Journi-bot"}
                                        </div>
                                        <div className="chat-bubble-body small">{m.text}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {loading && (
                            <div className="chat-ai-message chat-ai-message-bot">
                                <div className="chat-ai-bubble small text-muted">
                                    Journi-bot đang nghĩ câu trả lời cho bạn...
                                </div>
                            </div>
                        )}
                    </div>

                    {suggestions.length > 0 && (
                        <div className="chat-ai-suggestions-box mt-2">
                            <div className="small text-muted mb-1">
                                Các gợi ý địa điểm cho bạn:
                            </div>
                            <div className="chat-ai-suggestions">
                                {suggestions.map((sug) => (
                                    <div
                                        key={sug.id}
                                        className="card mb-1 place-suggestion-item border-0"
                                    >
                                        <div className="card-body py-2 px-3">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <strong className="small">{sug.name}</strong>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => handleAddSuggestionToPlan(sug)}
                                                >
                                                    + Thêm vào lịch trình
                                                </button>
                                            </div>
                                            {sug.description && (
                                                <p className="small mb-1">{sug.description}</p>
                                            )}
                                            {typeof sug.cost === "number" && sug.cost > 0 && (
                                                <p className="small mb-0 text-muted">
                                                    Chi phí ước tính:{" "}
                                                    {sug.cost.toLocaleString("vi-VN")} đ
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="chat-ai-input mt-auto">
                    <div className="input-group">
                        <textarea
                            className="form-control"
                            rows={3}
                            style={{ minHeight: 70, maxHeight: 120 }}
                            placeholder={inputPlaceholder}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                        >
                            Gửi
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ Modal render bằng Portal để không bị cắt/clip */}
            {HotelModal}
        </>
    );
}

export default ChatAI;
