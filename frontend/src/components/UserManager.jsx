import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, User, X, Pencil, KeyRound, AlertTriangle } from 'lucide-react';
import API_BASE_URL from '../config';

const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // stores user obj to delete
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [addForm, setAddForm] = useState({ username: '', password: '', full_name: '', role: 'USER' });
    const [editForm, setEditForm] = useState({ id: null, full_name: '', role: 'USER', password: '' });

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, { headers: getAuthHeader() });
            if (response.ok) setUsers(await response.json());
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // ─── Thêm người dùng ─────────────────────────────────
    const handleAddUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify(addForm)
            });
            if (response.ok) {
                setShowAddModal(false);
                setAddForm({ username: '', password: '', full_name: '', role: 'USER' });
                fetchUsers();
            } else {
                const data = await response.json();
                alert(`Lỗi: ${data.error}`);
            }
        } catch (error) {
            console.error('Error adding user:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Chỉnh sửa người dùng ────────────────────────────
    const openEditModal = (user) => {
        setEditForm({ id: user.id, full_name: user.full_name || '', role: user.role, password: '' });
        setShowEditModal(true);
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${editForm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    full_name: editForm.full_name,
                    role: editForm.role,
                    password: editForm.password
                })
            });
            if (response.ok) {
                setShowEditModal(false);
                fetchUsers();
            } else {
                const data = await response.json();
                alert(`Lỗi: ${data.error}`);
            }
        } catch (error) {
            console.error('Error editing user:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Xóa người dùng ──────────────────────────────────
    const handleDeleteUser = async () => {
        if (!showDeleteConfirm) return;
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${showDeleteConfirm.id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            if (response.ok) {
                setShowDeleteConfirm(null);
                fetchUsers();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Role Select Component ────────────────────────────
    const RoleSelector = ({ value, onChange, name }) => (
        <div className="flex gap-4">
            {['USER', 'ADMIN'].map(r => (
                <label key={r} className="flex-1 cursor-pointer">
                    <input type="radio" name={name} value={r} className="hidden peer"
                        checked={value === r} onChange={onChange} />
                    <div className="py-4 border-2 border-slate-100 rounded-2xl text-center font-black text-xs
                        peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-600 transition-all">
                        {r === 'ADMIN' ? '🛡️ Quản trị / Admin' : '👤 Nhân viên / User'}
                    </div>
                </label>
            ))}
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quản Lý <span className="text-blue-600">Người Dùng</span></h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phân quyền / Access Control · {users.length} tài khoản</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 transform hover:-translate-y-1 active:scale-95"
                >
                    <UserPlus size={20} />
                    Thêm tài khoản
                </button>
            </header>

            {/* User Table */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600" />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ & Tên / Name</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò / Role</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tạo / Created</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác / Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl flex-shrink-0 ${u.role === 'ADMIN' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {u.role === 'ADMIN' ? <Shield size={20} /> : <User size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{u.full_name || '—'}</p>
                                                <p className="text-xs font-bold text-slate-400">@{u.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider
                                            ${u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-slate-500">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Edit button */}
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Chỉnh sửa"
                                            >
                                                <Pencil size={17} />
                                            </button>
                                            {/* Delete button — protect admin account */}
                                            {u.username !== 'admin' && (
                                                <button
                                                    onClick={() => setShowDeleteConfirm(u)}
                                                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Xóa tài khoản"
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Modal: Thêm người dùng ─────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <form onSubmit={handleAddUser}>
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><UserPlus size={22} /></div>
                                    <h3 className="text-2xl font-black text-slate-800">Thêm tài khoản mới</h3>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                                    <X size={22} />
                                </button>
                            </div>
                            <div className="p-10 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Họ & Tên / Full Name</label>
                                    <input required name="full_name"
                                        className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                        placeholder="Tên nhân viên..."
                                        value={addForm.full_name}
                                        onChange={e => setAddForm({ ...addForm, full_name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tên đăng nhập</label>
                                        <input required name="username"
                                            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="username"
                                            value={addForm.username}
                                            onChange={e => setAddForm({ ...addForm, username: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Mật khẩu</label>
                                        <input required type="password" name="password"
                                            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="••••••••"
                                            value={addForm.password}
                                            onChange={e => setAddForm({ ...addForm, password: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Vai trò / Role</label>
                                    <RoleSelector value={addForm.role} name="role_add"
                                        onChange={e => setAddForm({ ...addForm, role: e.target.value })} />
                                </div>
                            </div>
                            <div className="p-8 bg-slate-50 border-t border-slate-100">
                                <button type="submit" disabled={submitting}
                                    className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-60">
                                    {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Chỉnh sửa người dùng ───────────────── */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <form onSubmit={handleEditUser}>
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><Pencil size={22} /></div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800">Chỉnh sửa tài khoản</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">@{users.find(u => u.id === editForm.id)?.username}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                                    <X size={22} />
                                </button>
                            </div>
                            <div className="p-10 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Họ & Tên / Full Name</label>
                                    <input required name="full_name"
                                        className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none bg-slate-50 font-bold"
                                        placeholder="Tên nhân viên..."
                                        value={editForm.full_name}
                                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Vai trò / Role</label>
                                    <RoleSelector value={editForm.role} name="role_edit"
                                        onChange={e => setEditForm({ ...editForm, role: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <KeyRound size={12} /> Mật khẩu mới (để trống = giữ nguyên)
                                    </label>
                                    <input type="password" name="password"
                                        className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none bg-slate-50 font-bold"
                                        placeholder="••••••••  (tuỳ chọn)"
                                        value={editForm.password}
                                        onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                                </div>
                            </div>
                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                                <button type="button" onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-5 rounded-[2rem] font-black text-slate-500 hover:bg-slate-100 transition-all text-sm uppercase tracking-widest">
                                    Huỷ
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-[2] bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-60">
                                    {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Xác nhận xóa ────────────────────────── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle size={36} className="text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Xóa tài khoản?</h3>
                            <p className="text-sm font-bold text-slate-500 mt-2">
                                Tài khoản <span className="text-rose-600">@{showDeleteConfirm.username}</span> ({showDeleteConfirm.full_name}) sẽ bị xóa vĩnh viễn.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 py-4 rounded-2xl font-black text-slate-600 hover:bg-slate-100 transition-all text-sm uppercase tracking-wider">
                                Huỷ
                            </button>
                            <button onClick={handleDeleteUser} disabled={submitting}
                                className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all disabled:opacity-60">
                                {submitting ? 'Đang xóa...' : 'Xóa tài khoản'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager;
