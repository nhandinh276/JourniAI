import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

const Register = () => {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);

            await setDoc(doc(db, "users", res.user.uid), {
                uid: res.user.uid,
                username,
                email
            });

            navigate("/login");
        } catch (err) {
            setError("Email đã tồn tại hoặc không hợp lệ!");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card fade-in">
                <h2 className="auth-title">Tạo tài khoản JourniAI</h2>
                {error && <p className="text-danger">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label>Email</label>
                        <input type="email" className="form-control"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label>Tên tài khoản</label>
                        <input type="text" className="form-control"
                            value={username} onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label>Mật khẩu</label>
                        <input type="password" className="form-control"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button className="btn btn-primary w-100 py-2 mt-2">Đăng ký</button>
                </form>
            </div>
        </div>
    );
};

export default Register;
