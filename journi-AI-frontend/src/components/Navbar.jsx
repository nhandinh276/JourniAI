// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/authService";

const Navbar = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate("/login");
        } catch (err) {
            console.error("Lỗi đăng xuất:", err);
        }
    };

    const displayName = user?.displayName || user?.email || "Bạn";

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-primary text-white">
            <div className="container">
                <Link className="navbar-brand text-white fw-bold" to="/">
                    JourniAI
                </Link>

                <div className="d-flex align-items-center">
                    {user ? (
                        <>
                            <span className="me-3">👋 {displayName}</span>

                            <Link className="btn btn-outline-light me-2" to="/">
                                Trang chính
                            </Link>

                            <Link className="btn btn-outline-light me-2" to="/places">
                                Địa điểm
                            </Link>

                            <button
                                className="btn btn-light text-primary fw-bold"
                                onClick={handleLogout}
                            >
                                Đăng xuất
                            </button>
                        </>
                    ) : (
                        <>
                            <Link className="btn btn-outline-light me-2" to="/login">
                                Đăng nhập
                            </Link>
                            <Link className="btn btn-light text-primary fw-bold" to="/register">
                                Đăng ký
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
