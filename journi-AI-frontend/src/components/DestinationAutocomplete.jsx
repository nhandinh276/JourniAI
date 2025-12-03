// src/components/DestinationAutocomplete.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./DestinationAutocomplete.css";

const DEFAULT_PLACES = [
    "Hà Nội",
    "Huế",
    "Đà Nẵng",
    "Đà Lạt",
    "TP. Hồ Chí Minh",
    "Nha Trang",
    "Hội An",
    "Sapa",
    "Phú Quốc",
    "Hạ Long",
    "Cần Thơ",
    "Quy Nhơn",
    "Vũng Tàu",
    "Phan Thiết",
    "Mộc Châu",
];

function normalizeVN(str = "") {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/đ/g, "d");
}

export default function DestinationAutocomplete({
    value,
    onChange,
    onSelect,
    places = DEFAULT_PLACES,
    placeholder = "Ví dụ: Huế, Đà Nẵng, Đà Lạt...",
}) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    const filtered = useMemo(() => {
        const q = normalizeVN(value);
        if (!q) return places.slice(0, 8);
        return places
            .filter((p) => normalizeVN(p).startsWith(q))
            .slice(0, 8);
    }, [value, places]);

    useEffect(() => {
        const onClickOutside = (e) => {
            if (!wrapperRef.current?.contains(e.target)) {
                setOpen(false);
                setHighlight(-1);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const handlePick = (place) => {
        onSelect?.(place);
        setOpen(false);
        setHighlight(-1);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e) => {
        if (!open) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            if (highlight >= 0 && filtered[highlight]) {
                e.preventDefault();
                handlePick(filtered[highlight]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
            setHighlight(-1);
        }
    };

    return (
        <div className="dest-autocomplete" ref={wrapperRef}>
            <input
                ref={inputRef}
                type="text"
                className="form-control rounded-pill px-3"
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange?.(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
            />

            {open && filtered.length > 0 && (
                <div className="dest-dropdown">
                    {filtered.map((p, i) => (
                        <div
                            key={p}
                            className={
                                "dest-item " + (i === highlight ? "active" : "")
                            }
                            onMouseEnter={() => setHighlight(i)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handlePick(p)}
                        >
                            {p}
                        </div>
                    ))}
                </div>
            )}

            {open && filtered.length === 0 && value.trim() && (
                <div className="dest-dropdown empty">
                    Không tìm thấy gợi ý phù hợp.
                </div>
            )}
        </div>
    );
}
