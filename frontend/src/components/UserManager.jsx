import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, User, X, Check, AlertCircle } from 'lucide-react';
import API_BASE_URL from '../config';

const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'USER'
    });

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: getAuthHeader()
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowAddModal(false);
                setFormData({ username: '', password: '', full_name: '', role: 'USER' });
                fetchUsers();
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error adding user:', error);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            if (response.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quản Lý <span className="text-blue-600">Người Dùng</span></h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hệ thống phân quyền truy cập</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 transform hover:-translate-y-1 active:scale-95"
                >
                    <UserPlus size={20} />
                    Thêm tài khoản
                </button>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ tên & Tài khoản</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tạo</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${u.role === 'ADMIN' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {u.role === 'ADMIN' ? <Shield size={20} /> : <User size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900">{u.full_name || 'Họ tên trống'}</p>
                                            <p className="text-xs font-bold text-slate-400">@{u.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="text-xs font-bold text-slate-500">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</p>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    {u.username !== 'admin' && (
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <form onSubmit={handleAddUser}>
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
                                        <UserPlus size={24} strokeWidth={3} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Thêm tài khoản mới</h3>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-10 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Họ và tên</label>
                                    <input
                                        required
                                        name="full_name"
                                        className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                        placeholder="Tên nhân viên..."
                                        value={formData.full_name}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tên tài khoản</label>
                                        <input
                                            required
                                            name="username"
                                            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Mật khẩu</label>
                                        <input
                                            required
                                            type="password"
                                            name="password"
                                            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Vai trò hệ thống</label>
                                    <div className="flex gap-4">
                                        {['USER', 'ADMIN'].map(r => (
                                            <label key={r} className="flex-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={r}
                                                    className="hidden peer"
                                                    checked={formData.role === r}
                                                    onChange={handleInputChange}
                                                />
                                                <div className="py-4 border-2 border-slate-100 rounded-2xl text-center font-black text-xs peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-600 transition-all">
                                                    {r === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                                >
                                    Khởi tạo tài khoản
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager;
