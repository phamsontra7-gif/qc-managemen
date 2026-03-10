import React, { useState } from 'react';
import { Lock, User, LogIn, ShieldAlert, CheckCircle2 } from 'lucide-react';
import API_BASE_URL from '../config';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin(data.user);
            } else {
                setError(data.error || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Không thể kết nối tới máy chủ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden relative font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse transition-all duration-1000"></div>

            <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="bg-white/[0.03] backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-6">
                        <div className="bg-white p-5 rounded-[2rem] inline-block mx-auto shadow-2xl shadow-blue-500/10 transition-transform duration-500 hover:scale-105">
                            <img src="/fusion_logo.png" alt="Fusion Group" className="h-10 object-contain" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-white tracking-tighter">Issue <span className="text-blue-500">Management</span></h1>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] inline-flex items-center gap-2">
                                <CheckCircle2 size={10} className="text-emerald-500" />
                                Secured Management Portal
                            </p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                            <ShieldAlert className="text-rose-500" size={20} />
                            <p className="text-rose-500 text-xs font-bold uppercase tracking-wider">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Tên thẻ / Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-600 group-focus-within:text-blue-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-14 pr-6 py-4 bg-white/[0.05] border-2 border-transparent focus:border-blue-500 rounded-2xl text-white font-bold transition-all outline-none focus:bg-white/[0.08] placeholder:text-slate-700"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Mật khẩu / Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-600 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-14 pr-6 py-4 bg-white/[0.05] border-2 border-transparent focus:border-blue-500 rounded-2xl text-white font-bold transition-all outline-none focus:bg-white/[0.08] placeholder:text-slate-700"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-black transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed group text-sm uppercase tracking-[0.2em]"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>Đang xác thực / Authenticating...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span>Đăng Nhập / Login</span>
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">Contact IT for access credentials</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
