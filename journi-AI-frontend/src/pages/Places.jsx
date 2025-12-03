// src/pages/Places.jsx
import React, { useEffect, useState } from "react";
import { addPlace, getPlaces, removePlace } from "../services/placeService";

const Places = () => {
    const [places, setPlaces] = useState([]);
    const [form, setForm] = useState({
        name: "",
        location: "",
        type: "",
        description: "",
    });

    useEffect(() => {
        const load = async () => {
            const data = await getPlaces();
            setPlaces(data);
        };
        load();
    }, []);

    const handleChange = (e) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.name) return;
        const newPlace = await addPlace(form);
        setPlaces((prev) => [...prev, newPlace]);
        setForm({ name: "", location: "", type: "", description: "" });
    };

    const handleDelete = async (id) => {
        await removePlace(id);
        setPlaces((prev) => prev.filter((p) => p.id !== id));
    };

    return (
        <div className="container mt-4">
            <h2>Quản lý địa điểm</h2>

            <form className="card p-3 my-3" onSubmit={handleAdd}>
                <div className="row g-2">
                    <div className="col-md-3">
                        <input
                            name="name"
                            className="form-control"
                            placeholder="Tên địa điểm"
                            value={form.name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-md-3">
                        <input
                            name="location"
                            className="form-control"
                            placeholder="Vị trí (VD: Đà Nẵng)"
                            value={form.location}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-md-2">
                        <input
                            name="type"
                            className="form-control"
                            placeholder="Loại (biển, núi...)"
                            value={form.type}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-md-4">
                        <input
                            name="description"
                            className="form-control"
                            placeholder="Mô tả ngắn"
                            value={form.description}
                            onChange={handleChange}
                        />
                    </div>
                </div>
                <button className="btn btn-primary mt-3">Thêm địa điểm</button>
            </form>

            <div className="row">
                {places.map((p) => (
                    <div className="col-md-4 mb-3" key={p.id}>
                        <div className="card p-3">
                            <h5>{p.name}</h5>
                            <p className="mb-1">{p.location}</p>
                            <p className="mb-1 text-muted">{p.type}</p>
                            <p className="mb-2">{p.description}</p>
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(p.id)}
                            >
                                Xoá
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Places;
