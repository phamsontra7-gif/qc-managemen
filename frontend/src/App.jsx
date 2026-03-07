import React, { useState, useEffect } from 'react';
import IssueList from './components/IssueList';
import { Plus, X, AlertCircle, CheckCircle2, Clock, Calendar, ShieldCheck, Layers, ChevronRight, ChevronDown, LogOut, User as UserIcon, Users as UsersIcon, LayoutGrid } from 'lucide-react';
import Login from './components/Login';
import UserManager from './components/UserManager';
import API_BASE_URL from './config';

function App() {
    const [view, setView] = useState('dashboard');
    const [issues, setIssues] = useState([]);
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [formData, setFormData] = useState({
        product_name: '',
        product_type: '',
        defect_description: '',
        quantity: '',
        unit: 'kg',
        status: 'NEW',
        issue_code: '',
        lot_no: '',
        year_id: '',
        material_category_id: '',
        resolution_direction: '',
        received_date: new Date().toISOString().split('T')[0],
        detected_date: new Date().toISOString().split('T')[0]
    });

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const fetchData = async (yearId = null, catId = null) => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch Years & Categories for sidebar
            const yResponse = await fetch(`${API_BASE_URL}/api/years`, {
                headers: getAuthHeader()
            });
            if (yResponse.ok) {
                const yData = await yResponse.json();
                setYears(yData);
            }

            // Fetch Filtered Issues
            let url = `${API_BASE_URL}/api/issues`;
            const params = new URLSearchParams();
            if (catId) params.append('category_id', catId);
            else if (yearId) params.append('year_id', yearId);

            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, {
                headers: getAuthHeader()
            });
            if (response.ok) {
                const data = await response.json();
                setIssues(data);
            } else if (response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(selectedYear, selectedCategory);
    }, [selectedYear, selectedCategory, user]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const stats = {
        total: issues.length,
        new: issues.filter(i => i.status === 'NEW').length,
        pending: issues.filter(i => i.status === 'PENDING').length,
        done: issues.filter(i => i.status === 'DONE').length
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.year_id) {
            alert('Vui lòng chọn Năm lưu trữ!');
            return;
        }
        if (!formData.product_type) {
            alert('Vui lòng chọn Phân loại sản phẩm!');
            return;
        }
        try {
            const dataToSend = {
                ...formData,
                // Ensure numeric fields are numbers or null, not empty strings
                year_id: formData.year_id ? parseInt(formData.year_id) : null,
                material_category_id: formData.material_category_id ? parseInt(formData.material_category_id) : null,
                quantity: formData.quantity ? parseFloat(formData.quantity) : null
            };

            const response = await fetch(`${API_BASE_URL}/api/issues`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify(dataToSend),
            });

            if (response.ok) {
                setShowModal(false);
                setFormData({
                    product_name: '',
                    product_type: '',
                    defect_description: '',
                    quantity: '',
                    unit: 'kg',
                    status: 'NEW',
                    issue_code: '',
                    lot_no: '',
                    year_id: '',
                    material_category_id: '',
                    resolution_direction: '',
                    received_date: new Date().toISOString().split('T')[0],
                    detected_date: new Date().toISOString().split('T')[0]
                });
                fetchData(selectedYear, selectedCategory);
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error creating issue:', error);
        }
    };

    if (!user) {
        return <Login onLogin={setUser} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Sidebar */}
            <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col sticky top-0 h-screen shadow-2xl z-20 overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                            <Layers size={24} strokeWidth={2.5} />
                        </div>
                        <span className="font-black text-xl tracking-tighter uppercase">QC Dashboard</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Hệ thống quản lý dữ liệu</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    <div className="pb-2 px-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Hệ thống</p>
                    </div>

                    <button
                        onClick={() => setView('dashboard')}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <LayoutGrid size={20} className={view === 'dashboard' ? '' : 'text-slate-400 group-hover:text-blue-500'} />
                        Tổng quan báo cáo
                    </button>

                    {user.role === 'ADMIN' && (
                        <button
                            onClick={() => setView('users')}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group ${view === 'users' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <UsersIcon size={20} className={view === 'users' ? '' : 'text-slate-400 group-hover:text-indigo-500'} />
                            Quản lý tài khoản
                        </button>
                    )}

                    {view === 'dashboard' && (
                        <>
                            <div className="pt-6 pb-2 px-5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Lưu trữ theo năm</p>
                            </div>

                            <button
                                onClick={() => { setSelectedYear(null); setSelectedCategory(null); }}
                                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group ${selectedYear === null ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <LayoutGrid size={18} className={selectedYear === null ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-500'} />
                                <span>Tất cả</span>
                            </button>

                            {years.map(y => (
                                <button
                                    key={y.id}
                                    onClick={() => { setSelectedYear(y.id); setSelectedCategory(null); }}
                                    className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 ${selectedYear === y.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Calendar size={18} className={selectedYear === y.id ? 'text-blue-400' : 'text-slate-400'} />
                                    <span>Năm {y.year}</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-2xl text-white shadow-lg">
                            <UserIcon size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-black text-slate-800 truncate">{user.name || user.username}</p>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black text-xs text-rose-500 hover:bg-rose-50 transition-all duration-300 border-2 border-transparent hover:border-rose-100 uppercase tracking-[0.2em]"
                    >
                        <LogOut size={16} strokeWidth={3} />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {view === 'dashboard' ? (
                        <>
                            <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white w-fit px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                                        <span>Báo cáo</span>
                                        <ChevronRight size={12} strokeWidth={3} className="text-blue-500" />
                                        <span className={selectedYear ? 'text-slate-900' : 'text-blue-600 font-extrabold'}>{selectedYear ? `Năm ${years.find(y => y.id === selectedYear)?.year}` : 'Tất cả năm'}</span>
                                        {selectedCategory && (
                                            <>
                                                <ChevronRight size={12} strokeWidth={3} className="text-blue-500" />
                                                <span className="text-blue-600 font-extrabold">
                                                    Danh mục ID: {selectedCategory}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                                        Quản Lý <span className="text-blue-600">Sự Cố</span> QC
                                    </h1>
                                </div>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="group bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all duration-300 flex items-center gap-3 transform hover:-translate-y-1 active:scale-95"
                                >
                                    <Plus size={22} strokeWidth={3} />
                                    Báo cáo mới
                                </button>
                            </header>

                            {/* Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                                {[
                                    { label: 'Sự cố', value: stats.total, color: 'blue', icon: Clock },
                                    { label: 'Mới', value: stats.new, color: 'rose', icon: AlertCircle },
                                    { label: 'Đang xử lý', value: stats.pending, color: 'amber', icon: Clock },
                                    { label: 'Hoàn thành', value: stats.done, color: 'emerald', icon: CheckCircle2 },
                                ].map((stat, idx) => (
                                    <div key={idx} className={`bg-white p-7 rounded-[2.5rem] shadow-sm border-b-8 border-${stat.color}-500 transition-all duration-500 hover:shadow-2xl hover:shadow-${stat.color}-100 hover:-translate-y-2 group`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-500 transition-colors">{stat.label}</p>
                                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                                            </div>
                                            <div className={`bg-${stat.color}-50 p-4 rounded-3xl text-${stat.color}-600 group-hover:bg-${stat.color}-500 group-hover:text-white transition-all duration-500`}>
                                                <stat.icon size={28} strokeWidth={2.5} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="relative">
                                        <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-slate-100 border-t-blue-600"></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-in fade-in duration-700">
                                    <IssueList issues={issues} />
                                </div>
                            )}
                        </>
                    ) : (
                        <UserManager />
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20 my-auto">
                        <form onSubmit={handleSubmit} className="flex flex-col h-full">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
                                        <Plus size={24} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cập nhật báo cáo QC mới</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Thông tin chi tiết sự cố</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowModal(false)} className="p-3 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400 hover:text-slate-900">
                                    <X size={24} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar-minimal">
                                {/* Năm lưu trữ & Phân loại sản phẩm */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Năm lưu trữ *</label>
                                        <select
                                            required
                                            name="year_id"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            value={formData.year_id}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">-- Chọn năm --</option>
                                            {years.map(y => (
                                                <option key={y.id} value={y.id}>Năm {y.year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Phân loại sản phẩm *</label>
                                        <select
                                            required
                                            name="product_type"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            value={formData.product_type}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">-- Chọn phân loại --</option>
                                            <option value="Nguyên Vật Liệu/Raw Material">Nguyên Vật Liệu/Raw Material</option>
                                            <option value="Repacking">Repacking</option>
                                            <option value="Thành phẩm/Products">Thành phẩm/Products</option>
                                            <option value="Khác/Other">Khác/Other</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Thời gian & Mã định danh */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Thời gian phát hiện *</label>
                                        <input
                                            required
                                            name="detected_date"
                                            type="date"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold cursor-pointer"
                                            value={formData.detected_date}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Mã định danh</label>
                                        <input
                                            name="issue_code"
                                            type="text"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="Tự động: AA-DDMMYY-TT"
                                            value={formData.issue_code}
                                            onChange={handleInputChange}
                                        />
                                        <p className="text-[9px] text-slate-400 italic ml-2">* Để trống để hệ thống tự tạo mã theo nhóm</p>
                                    </div>
                                </div>

                                {/* Tên sản phẩm */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tên sản phẩm *</label>
                                    <input
                                        required
                                        name="product_name"
                                        type="text"
                                        className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                        placeholder="Tên sản phẩm..."
                                        value={formData.product_name}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* Mô tả lỗi */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Mô tả lỗi *</label>
                                    <textarea
                                        required
                                        name="defect_description"
                                        className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-rose-500 outline-none bg-slate-50 font-bold min-h-[100px] resize-none"
                                        placeholder="Mô tả chi tiết sự cố..."
                                        value={formData.defect_description}
                                        onChange={handleInputChange}
                                    ></textarea>
                                </div>

                                {/* Số lượng, Đơn vị, Số lot */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <span>Số lượng</span>
                                        </label>
                                        <input
                                            name="quantity"
                                            type="number"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="0.00"
                                            value={formData.quantity}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <span>Đơn vị</span>
                                        </label>
                                        <select
                                            name="unit"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-white font-black shadow-sm cursor-pointer"
                                            value={formData.unit}
                                            onChange={handleInputChange}
                                        >
                                            <option value="kg">kg</option>
                                            <option value="bao">Bao</option>
                                            <option value="pallet">Pallet</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <span>Số Lot</span>
                                        </label>
                                        <input
                                            name="lot_no"
                                            type="text"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="Lot No..."
                                            value={formData.lot_no}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                {/* Hướng xử lý */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Hướng xử lý</label>
                                    <textarea
                                        name="resolution_direction"
                                        className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-emerald-500 outline-none bg-slate-50 font-bold min-h-[80px] resize-none"
                                        placeholder="Phương án giải quyết..."
                                        value={formData.resolution_direction}
                                        onChange={handleInputChange}
                                    ></textarea>
                                </div>

                                {/* Trạng thái xử lý */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Trạng thái xử lý</label>
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        {[
                                            { id: 'NEW', label: 'mới (new)', color: 'rose' },
                                            { id: 'PENDING', label: 'pending', color: 'amber' },
                                            { id: 'DONE', label: 'hoàn thành (done)', color: 'emerald' },
                                        ].map(s => (
                                            <label key={s.id} className="cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value={s.id}
                                                    className="hidden peer"
                                                    checked={formData.status === s.id}
                                                    onChange={handleInputChange}
                                                />
                                                <div className={`px-6 py-3 rounded-2xl border-2 border-slate-100 font-black text-xs transition-all duration-300 group-hover:bg-slate-50
                                                    ${s.id === 'NEW' ? 'peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:text-rose-700' :
                                                        s.id === 'PENDING' ? 'peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700' :
                                                            'peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700'}`}>
                                                    {s.label}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-8 py-5 rounded-[2rem] font-black text-slate-500 hover:text-slate-900 transition-all text-sm uppercase tracking-widest"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all transform hover:-translate-y-1 active:scale-95 text-sm uppercase tracking-[0.2em]"
                                >
                                    Lưu báo cáo hệ thống
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
