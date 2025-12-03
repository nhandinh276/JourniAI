import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/");
        } catch (err) {
            setError("Sai tài khoản hoặc mật khẩu");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card fade-in">
                <h2 className="auth-title">Đăng nhập JourniAI</h2>
                {error && <p className="text-danger">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label>Email</label>
                        <input type="email" className="form-control"
                            value={email} onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label>Mật khẩu</label>
                        <input type="password" className="form-control"
                            value={password} onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button className="btn btn-primary w-100 py-2 mt-2">Đăng nhập</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
