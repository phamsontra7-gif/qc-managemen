import React, { useState, useEffect } from 'react';
import IssueList from './components/IssueList';
import { Plus, X, AlertCircle, CheckCircle2, Clock, Calendar, ShieldCheck, Layers, ChevronRight, ChevronDown, LogOut, User as UserIcon, Users as UsersIcon, LayoutGrid, Camera, Image as ImageIcon, Bell } from 'lucide-react';
import Login from './components/Login';
import UserManager from './components/UserManager';
import API_BASE_URL from './config';
import { io } from 'socket.io-client';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

// Helper: trả về URL ảnh đúng (Cloudinary hoặc local)
const getImageSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
};


// ─── Year Comparison Chart Component ───────────────────────────────────────
function YearComparisonChart({ data }) {
    const [tooltip, setTooltip] = React.useState(null);

    if (!data) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-slate-100 border-t-blue-600"></div>
            </div>
        );
    }

    const { currentYear, previousYear, groups } = data;

    // Short labels for chart
    const shortLabel = (pt) => {
        if (!pt) return 'Khác';
        if (pt.toLowerCase().includes('thành phẩm') || pt.toLowerCase().includes('products')) return 'Thành phẩm';
        if (pt.toLowerCase().includes('nguyên') || pt.toLowerCase().includes('raw')) return 'Nguyên VL';
        if (pt.toLowerCase().includes('repacking')) return 'Repacking';
        return pt.length > 12 ? pt.slice(0, 10) + '…' : pt;
    };

    const maxVal = Math.max(1, ...groups.flatMap(g => [g.current.total, g.previous.total]));
    const chartH = 220;
    const barW = 32;
    const gap = 8;
    const groupGap = 28;
    const groupW = barW * 2 + gap + groupGap;
    const padL = 48;
    const padR = 20;
    const padT = 20;
    const padB = 64;
    const totalW = padL + groups.length * groupW + padR;

    const barHeight = (val) => (val / maxVal) * chartH;

    // Y-axis grid lines
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => ({
        y: padT + chartH - p * chartH,
        label: Math.round(p * maxVal)
    }));

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm p-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">So sánh số lượng sự cố theo nhóm / Comparison by Category</p>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Năm / Year <span className="text-blue-600">{currentYear}</span>
                        <span className="text-slate-400 font-bold text-lg mx-3">vs</span>
                        Năm / Year <span className="text-slate-500">{previousYear}</span>
                    </h2>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-blue-500"></div>
                        <span className="text-sm font-bold text-slate-600">Năm / Year {currentYear}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-slate-300"></div>
                        <span className="text-sm font-bold text-slate-600">Năm / Year {previousYear}</span>
                    </div>
                </div>
            </div>

            {groups.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <p className="text-sm font-bold">Chưa có dữ liệu cho hai năm này</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <svg
                        width={totalW}
                        height={chartH + padT + padB}
                        style={{ minWidth: Math.min(totalW, 600) + 'px', width: '100%' }}
                        viewBox={`0 0 ${totalW} ${chartH + padT + padB}`}
                        preserveAspectRatio="xMinYMid meet"
                    >
                        {/* Grid lines */}
                        {gridLines.map((gl, i) => (
                            <g key={i}>
                                <line
                                    x1={padL} y1={gl.y}
                                    x2={totalW - padR} y2={gl.y}
                                    stroke="#f1f5f9" strokeWidth="1.5"
                                />
                                <text
                                    x={padL - 8} y={gl.y + 4}
                                    textAnchor="end"
                                    fontSize="11" fontWeight="700"
                                    fill="#94a3b8"
                                >{gl.label}</text>
                            </g>
                        ))}

                        {/* Bars */}
                        {groups.map((g, gi) => {
                            const x0 = padL + gi * groupW;
                            const curH = barHeight(g.current.total);
                            const prevH = barHeight(g.previous.total);
                            const curY = padT + chartH - curH;
                            const prevY = padT + chartH - prevH;
                            const label = shortLabel(g.product_type);

                            return (
                                <g key={gi}>
                                    {/* Previous year bar */}
                                    <rect
                                        x={x0} y={prevY}
                                        width={barW} height={prevH}
                                        rx="8" fill="#cbd5e1"
                                        onMouseEnter={(e) => setTooltip({ x: x0 + barW / 2, y: prevY - 8, label: `${previousYear}: ${g.previous.total} (Mới:${g.previous.new} Xử lý:${g.previous.pending} Xong:${g.previous.done})` })}
                                        onMouseLeave={() => setTooltip(null)}
                                        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                        onMouseOver={e => e.target.style.opacity = 0.75}
                                        onMouseOut={e => e.target.style.opacity = 1}
                                    />
                                    {g.previous.total > 0 && (
                                        <text
                                            x={x0 + barW / 2} y={prevY - 6}
                                            textAnchor="middle"
                                            fontSize="11" fontWeight="800" fill="#64748b"
                                        >{g.previous.total}</text>
                                    )}

                                    {/* Current year bar */}
                                    <rect
                                        x={x0 + barW + gap} y={curY}
                                        width={barW} height={curH}
                                        rx="8" fill="#3b82f6"
                                        onMouseEnter={() => setTooltip({ x: x0 + barW + gap + barW / 2, y: curY - 8, label: `${currentYear}: ${g.current.total} (Mới:${g.current.new} Xử lý:${g.current.pending} Xong:${g.current.done})` })}
                                        onMouseLeave={() => setTooltip(null)}
                                        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                        onMouseOver={e => e.target.style.opacity = 0.75}
                                        onMouseOut={e => e.target.style.opacity = 1}
                                    />
                                    {g.current.total > 0 && (
                                        <text
                                            x={x0 + barW + gap + barW / 2} y={curY - 6}
                                            textAnchor="middle"
                                            fontSize="11" fontWeight="800" fill="#2563eb"
                                        >{g.current.total}</text>
                                    )}

                                    {/* X-axis label */}
                                    <text
                                        x={x0 + barW + gap / 2}
                                        y={padT + chartH + 20}
                                        textAnchor="middle"
                                        fontSize="11" fontWeight="700" fill="#475569"
                                    >{label}</text>
                                </g>
                            );
                        })}

                        {/* Baseline */}
                        <line
                            x1={padL} y1={padT + chartH}
                            x2={totalW - padR} y2={padT + chartH}
                            stroke="#e2e8f0" strokeWidth="2"
                        />

                        {/* Tooltip */}
                        {tooltip && (
                            <g>
                                <rect
                                    x={tooltip.x - 110} y={tooltip.y - 28}
                                    width={220} height={30}
                                    rx="8" fill="#1e293b" opacity="0.92"
                                />
                                <text
                                    x={tooltip.x} y={tooltip.y - 8}
                                    textAnchor="middle"
                                    fontSize="10" fontWeight="700" fill="white"
                                >{tooltip.label}</text>
                            </g>
                        )}
                    </svg>
                </div>
            )}

            {/* Summary table */}
            {groups.length > 0 && (
                <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhóm sản phẩm<br/>Product Group</th>
                                <th className="text-center py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng / Total<br/>{previousYear}</th>
                                <th className="text-center py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng / Total<br/>{currentYear}</th>
                                <th className="text-center py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thay đổi<br/>Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((g, i) => {
                                const diff = g.current.total - g.previous.total;
                                const isUp = diff > 0;
                                const isDown = diff < 0;
                                return (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-700">{shortLabel(g.product_type)}</td>
                                        <td className="py-3 px-4 text-center font-black text-slate-500">{g.previous.total}</td>
                                        <td className="py-3 px-4 text-center font-black text-blue-600">{g.current.total}</td>
                                        <td className="py-3 px-4 text-center">
                                            {diff === 0 ? (
                                                <span className="text-slate-400 font-bold">—</span>
                                            ) : (
                                                <span className={`font-black ${isUp ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {isUp ? '+' : ''}{diff}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
// ───────────────────────────────────────────────────────────────────────────

function App() {

    const [view, setView] = useState('dashboard');
    const [issues, setIssues] = useState([]);
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [yearComparisonData, setYearComparisonData] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('user');
            if (savedUser && savedUser !== 'undefined') {
                return JSON.parse(savedUser);
            }
        } catch (e) {
            console.error('Lỗi khi đọc dữ liệu người dùng:', e);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
        return null;
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
        detected_date: new Date().toISOString().split('T')[0],
        image_url: '',
        expiry_date: '',
        warehouse_entry_date: ''
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

    const fetchYearComparison = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/stats/yearly-comparison`, {
                headers: getAuthHeader()
            });
            if (res.ok) {
                const data = await res.json();
                setYearComparisonData(data);
            }
        } catch (err) {
            console.error('Error fetching yearly comparison:', err);
        }
    };

    useEffect(() => {
        fetchData(selectedYear, selectedCategory);
        if (selectedYear === null) {
            fetchYearComparison();
        }
    }, [selectedYear, selectedCategory, user]);

    // Socket Setup
    useEffect(() => {
        let socket;
        if (user) {
            socket = io(API_BASE_URL);

            socket.on('issue_created', (newIssue) => {
                const msg = `Báo cáo mới được tạo: ${newIssue.issue_code || newIssue.product_name}`;
                showNotification(msg, 'info');
                setNotificationHistory(prev => [{ id: Date.now(), message: msg, type: 'info', issue: newIssue, read: false }, ...prev]);

                setIssues(prevIssues => {
                    const exists = prevIssues.find(i => i.id === newIssue.id);
                    if (exists) return prevIssues;
                    return [newIssue, ...prevIssues];
                });
            });

            socket.on('issue_updated', (updatedIssue) => {
                const msg = `Sự cố ${updatedIssue.issue_code || updatedIssue.product_name} vừa được cập nhật`;
                showNotification(msg, 'success');
                setNotificationHistory(prev => [{ id: Date.now(), message: msg, type: 'success', issue: updatedIssue, read: false }, ...prev]);

                setIssues(prevIssues => {
                    return prevIssues.map(i => i.id === updatedIssue.id ? updatedIssue : i);
                });
            });
        }

        return () => {
            if (socket) socket.disconnect();
        };
    }, [user]);

    const showNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

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
        if (!formData.product_name || formData.product_name.trim() === '') {
            alert('Vui lòng nhập Tên sản phẩm!');
            return;
        }
        setLoading(true);
        try {
            let currentImageUrl = formData.image_url;

            // If a file is selected, upload it first
            if (selectedFile) {
                const uploadData = new FormData();
                uploadData.append('image', selectedFile);

                const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    headers: {
                        ...getAuthHeader()
                    },
                    body: uploadData
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    currentImageUrl = uploadResult.imageUrl;
                } else {
                    console.error('Failed to upload image');
                }
            }

            const dataToSend = {
                ...formData,
                image_url: currentImageUrl,
                // Ensure numeric fields are numbers or null, not empty strings
                year_id: formData.year_id ? parseInt(formData.year_id) : null,
                material_category_id: formData.material_category_id ? parseInt(formData.material_category_id) : null,
                quantity: formData.quantity ? parseFloat(formData.quantity) : null
            };

            const isUpdating = !!formData.id;
            const targetUrl = isUpdating
                ? `${API_BASE_URL}/api/issues/${formData.id}`
                : `${API_BASE_URL}/api/issues`;

            const response = await fetch(targetUrl, {
                method: isUpdating ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify(dataToSend),
            });

            if (response.ok) {
                // ... same success code
                setShowModal(false);
                setFormData({
                    id: null,
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
                    detected_date: new Date().toISOString().split('T')[0],
                    image_url: '',
                    expiry_date: '',
                    warehouse_entry_date: ''
                });
                setSelectedFile(null);
                setImagePreview(null);
                fetchData(selectedYear, selectedCategory);
                setLoading(false);
            } else {
                setLoading(false);
                const errorData = await response.json();
                console.error('Backend error:', errorData);
                alert(`Lỗi từ hệ thống: ${errorData.error || JSON.stringify(errorData)}`);
            }
        } catch (error) {
            setLoading(false);
            console.error('Error creating issue:', error);
            alert(`Lỗi kết nối: ${error.message}`);
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
                    <div className="flex items-center gap-4 mb-4">
                        <img src="/fusion_logo.png" alt="Fusion Group" className="h-10 object-contain drop-shadow-sm" />
                        <span className="font-black text-lg tracking-tighter uppercase text-slate-800 border-l-2 border-slate-200 pl-4">QC Dashboard</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Quản lý dữ liệu / Data Management</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    <div className="pb-2 px-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Hệ thống / System</p>
                    </div>

                    <button
                        onClick={() => setView('dashboard')}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <LayoutGrid size={20} className={view === 'dashboard' ? '' : 'text-slate-400 group-hover:text-blue-500'} />
                        Tổng quan / Dashboard
                    </button>

                    {user.role === 'ADMIN' && (
                        <button
                            onClick={() => setView('users')}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group ${view === 'users' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <UsersIcon size={20} className={view === 'users' ? '' : 'text-slate-400 group-hover:text-indigo-500'} />
                            Tài khoản / Users
                        </button>
                    )}

                    {view === 'dashboard' && (
                        <>
                            <div className="pt-6 pb-2 px-5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Theo năm / By Year</p>
                            </div>

                            <button
                                onClick={() => { setSelectedYear(null); setSelectedCategory(null); setSelectedStatus(null); }}
                                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group ${selectedYear === null ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <LayoutGrid size={18} className={selectedYear === null ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-500'} />
                                <span>Tất cả / All Years</span>
                            </button>

                            {years.map(y => (
                                <button
                                    key={y.id}
                                    onClick={() => { setSelectedYear(y.id); setSelectedCategory(null); setSelectedStatus(null); }}
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
                        Đăng xuất / Logout
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
                                        Issue <span className="text-blue-600">Management</span>
                                    </h1>
                                </div>

                                <div className="flex items-center gap-4 relative">
                                    <button
                                        onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                                        className="relative bg-white p-4 rounded-2xl shadow-sm text-slate-500 hover:text-blue-600 transition-all duration-300"
                                    >
                                        <Bell size={24} strokeWidth={2.5} />
                                        {notificationHistory.some(n => !n.read) && (
                                            <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full animate-pulse border-2 border-white"></span>
                                        )}
                                    </button>

                                    {showNotifDropdown && (
                                        <div className="absolute top-16 right-0 w-80 bg-white border border-slate-100 shadow-2xl rounded-3xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                                <span className="font-black text-sm uppercase tracking-wider text-slate-800">Thông báo / Alerts</span>
                                                <button
                                                    onClick={() => setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })))}
                                                    className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:underline"
                                                >
                                                    Đọc tất cả
                                                </button>
                                            </div>
                                            <div className="max-h-96 overflow-y-auto w-full custom-scrollbar-minimal">
                                                {notificationHistory.length > 0 ? (
                                                    notificationHistory.map(notif => (
                                                        <div
                                                            key={notif.id}
                                                            onClick={() => {
                                                                setNotificationHistory(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                                                setSelectedIssue(notif.issue);
                                                                setShowNotifDropdown(false);
                                                            }}
                                                            className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${notif.read ? 'opacity-60' : 'bg-blue-50/20'}`}
                                                        >
                                                            <div className={`p-2 rounded-xl h-fit ${notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                <Bell size={16} strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 mt-1 text-left">
                                                                <p className="text-xs font-bold text-slate-700 leading-snug break-words">{notif.message}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                        Chưa có thông báo / No Alerts
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setFormData({
                                                id: null,
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
                                                detected_date: new Date().toISOString().split('T')[0],
                                                image_url: '',
                                                expiry_date: '',
                                                warehouse_entry_date: ''
                                            });
                                            setShowModal(true);
                                        }}
                                        className="group bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all duration-300 flex items-center gap-3 transform hover:-translate-y-1 active:scale-95"
                                    >
                                        <Plus size={22} strokeWidth={3} />
                                        <span className="flex flex-col items-start leading-tight">
                                            <span>Báo cáo mới</span>
                                            <span className="text-[10px] font-bold opacity-75 tracking-widest uppercase">New Report</span>
                                        </span>
                                    </button>
                                </div>
                            </header>

                            {/* Mobile Year Selector */}
                            <div className="lg:hidden flex gap-3 overflow-x-auto pb-4 mb-8 custom-scrollbar-minimal w-full">
                                <button
                                    onClick={() => { setSelectedYear(null); setSelectedCategory(null); setSelectedStatus(null); }}
                                    className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 shadow-sm ${selectedYear === null ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
                                >
                                    <LayoutGrid size={18} className={selectedYear === null ? 'text-blue-400' : 'text-slate-400'} />
                                    Tất cả / All Years
                                </button>
                                {years.map(y => (
                                    <button
                                        key={y.id}
                                        onClick={() => { setSelectedYear(y.id); setSelectedCategory(null); setSelectedStatus(null); }}
                                        className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 shadow-sm ${selectedYear === y.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        <Calendar size={18} className={selectedYear === y.id ? 'text-blue-400' : 'text-slate-400'} />
                                        Năm {y.year}
                                    </button>
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                                {[
                                    { id: 'ALL', label: 'Sự cố / Total', value: stats.total, color: 'blue', icon: Clock },
                                    { id: 'NEW', label: 'This Week', value: stats.new, color: 'rose', icon: AlertCircle },
                                    { id: 'PENDING', label: 'Xử lý / Pending', value: stats.pending, color: 'amber', icon: Clock },
                                    { id: 'DONE', label: 'K.Thúc / Done', value: stats.done, color: 'emerald', icon: CheckCircle2 },
                                ].map((stat, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedStatus(stat.id)}
                                        className={`bg-white p-7 rounded-[2.5rem] shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-${stat.color}-100 hover:-translate-y-2 group cursor-pointer 
                                            ${selectedStatus === stat.id ? `border-b-8 border-${stat.color}-500 ring-4 ring-${stat.color}-50` : 'border-b-8 border-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-500 transition-colors">{stat.label}</p>
                                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                                            </div>
                                            <div className={`${selectedStatus === stat.id ? `bg-${stat.color}-500 text-white` : `bg-${stat.color}-50 text-${stat.color}-600`} p-4 rounded-3xl group-hover:bg-${stat.color}-500 group-hover:text-white transition-all duration-500`}>
                                                <stat.icon size={28} strokeWidth={2.5} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Back to chart button when stat card is selected */}
                            {selectedStatus !== null && selectedYear === null && (
                                <div className="mb-6">
                                    <button
                                        onClick={() => setSelectedStatus(null)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-blue-300 transition-all duration-300 shadow-sm"
                                    >
                                        <ChevronRight size={16} strokeWidth={3} className="rotate-180" />
                                        Quay lại biểu đồ / Back to Chart
                                    </button>
                                </div>
                            )}

                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="relative">
                                        <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-slate-100 border-t-blue-600"></div>
                                    </div>
                                </div>
                            ) : selectedYear === null && selectedStatus === null ? (
                                /* Year comparison chart shown when All Years and no stat card selected */
                                <YearComparisonChart data={yearComparisonData} />
                            ) : (
                                <div className="animate-in fade-in duration-700">
                                    <IssueList
                                        issues={issues.filter(issue => selectedStatus === null || selectedStatus === 'ALL' || issue.status === selectedStatus)}
                                        onSelectIssue={(issue) => setSelectedIssue(issue)}
                                    />
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
                        <form onSubmit={handleSubmit} className="flex flex-col h-full" autoComplete="off">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
                                        <Plus size={24} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                                            {formData.id ? 'Cập nhật sự cố / Update Issue' : 'Báo cáo sự cố / New Issue'}
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Chi tiết sự cố / Issue Details</p>
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
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Năm lưu trữ / Storage Year *</label>
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
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Phân loại / Product Type *</label>
                                        <select
                                            required
                                            name="product_type"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            value={formData.product_type}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">-- Chọn phân loại --</option>
                                            <option value="Nguyên Vật Liệu/Raw Masterial">Nguyên Vật Liệu/Raw Masterial</option>
                                            <option value="Repacking">Repacking</option>
                                            <option value="Thành phẩm/Products">Thành phẩm/Products</option>
                                            <option value="Khác/Other">Khác/Other</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Thời gian & Mã định danh */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">T.Gian phát hiện / Detected Date *</label>
                                        <div className="relative group">
                                            <input
                                                required
                                                name="detected_date"
                                                type="date"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                value={formData.detected_date}
                                                onChange={handleInputChange}
                                                onClick={(e) => {
                                                    try {
                                                        if (e.target.showPicker) e.target.showPicker();
                                                    } catch (err) {
                                                        console.log("showPicker format error");
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center justify-between w-full px-6 py-4 rounded-3xl border-2 border-slate-100 group-hover:border-blue-500 bg-slate-50 font-black text-slate-800 transition-colors pointer-events-none text-lg">
                                                <span>{formData.detected_date ? formatDate(formData.detected_date) : 'DD/MM/YYYY'}</span>
                                                <Calendar size={20} className="text-slate-600" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Mã định danh / Issue Code</label>
                                        <input
                                            name="issue_code"
                                            type="text"
                                            autoComplete="off"
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tên sản phẩm / Product Name *</label>
                                    <input
                                        required
                                        name="product_name"
                                        type="text"
                                        autoComplete="off"
                                        className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                        placeholder="Tên sản phẩm..."
                                        value={formData.product_name}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* Mô tả lỗi */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Mô tả lỗi / Defect Description *</label>
                                    <textarea
                                        required
                                        name="defect_description"
                                        autoComplete="off"
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
                                            <span>Số lượng / Quantity</span>
                                        </label>
                                        <input
                                            name="quantity"
                                            type="number"
                                            autoComplete="off"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="0.00"
                                            value={formData.quantity}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <span>Đơn vị / Unit</span>
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
                                            <span>Số Lot / Lot No</span>
                                        </label>
                                        <input
                                            name="lot_no"
                                            type="text"
                                            autoComplete="off"
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold"
                                            placeholder="Lot No..."
                                            value={formData.lot_no}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                {/* Hạn sử dụng & Ngày nhập kho */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Hạn sử dụng / Expiry Date</label>
                                        <div className="relative group">
                                            <input
                                                name="expiry_date"
                                                type="date"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                value={formData.expiry_date}
                                                onChange={handleInputChange}
                                                onClick={(e) => { try { if (e.target.showPicker) e.target.showPicker(); } catch (err) {} }}
                                            />
                                            <div className="flex items-center justify-between w-full px-6 py-4 rounded-3xl border-2 border-slate-100 group-hover:border-amber-400 bg-slate-50 font-black text-slate-800 transition-colors pointer-events-none text-base">
                                                <span className={formData.expiry_date ? 'text-slate-800' : 'text-slate-300'}>{formData.expiry_date ? formatDate(formData.expiry_date) : 'DD/MM/YYYY'}</span>
                                                <Calendar size={18} className="text-amber-400" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ngày nhập kho / Warehouse Entry Date</label>
                                        <div className="relative group">
                                            <input
                                                name="warehouse_entry_date"
                                                type="date"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                value={formData.warehouse_entry_date}
                                                onChange={handleInputChange}
                                                onClick={(e) => { try { if (e.target.showPicker) e.target.showPicker(); } catch (err) {} }}
                                            />
                                            <div className="flex items-center justify-between w-full px-6 py-4 rounded-3xl border-2 border-slate-100 group-hover:border-emerald-400 bg-slate-50 font-black text-slate-800 transition-colors pointer-events-none text-base">
                                                <span className={formData.warehouse_entry_date ? 'text-slate-800' : 'text-slate-300'}>{formData.warehouse_entry_date ? formatDate(formData.warehouse_entry_date) : 'DD/MM/YYYY'}</span>
                                                <Calendar size={18} className="text-emerald-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Hướng xử lý / Resolution</label>
                                    <textarea
                                        name="resolution_direction"
                                        className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:border-emerald-500 outline-none bg-slate-50 font-bold min-h-[80px] resize-none"
                                        placeholder="Phương án giải quyết..."
                                        value={formData.resolution_direction}
                                        onChange={handleInputChange}
                                    ></textarea>
                                </div>

                                {/* Đính kèm ảnh */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Đính kèm ảnh / Attached Image</label>
                                    <div className="flex items-center gap-6">
                                        <label className="cursor-pointer group">
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setSelectedFile(file);
                                                        setImagePreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                            <div className="w-32 h-32 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:border-blue-500 group-hover:text-blue-500 transition-all bg-slate-50">
                                                <Camera size={28} />
                                                <span className="text-[10px] font-black uppercase">Chọn ảnh</span>
                                            </div>
                                        </label>

                                        {(imagePreview || formData.image_url) && (
                                            <div className="relative group">
                                                <img
                                                    src={imagePreview || getImageSrc(formData.image_url)}
                                                    alt="Preview"
                                                    className="w-32 h-32 rounded-[2rem] object-cover border-2 border-blue-500 shadow-lg shadow-blue-100"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        setImagePreview(null);
                                                        setFormData(prev => ({ ...prev, image_url: '' }));
                                                    }}
                                                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        )}

                                        {!imagePreview && (
                                            <div className="flex-1 p-6 rounded-[2rem] bg-slate-100/50 border border-slate-200/50">
                                                <p className="text-xs text-slate-400 font-bold italic leading-relaxed">
                                                    * Hình ảnh giúp việc đối soát và xử lý sự cố nhanh chóng hơn. Hỗ trợ định dạng: JPG, PNG, WEBP.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Trạng thái xử lý */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Trạng thái / Status</label>
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
                                    Đóng / Close
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all transform hover:-translate-y-1 active:scale-95 text-sm uppercase tracking-[0.2em]"
                                >
                                    Lưu báo cáo / Save Report
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Detail Modal */}
            {selectedIssue && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20 my-auto">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
                                    <ShieldCheck size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Chi tiết sự cố / Issue Details</h2>
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{selectedIssue.issue_code}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedIssue(null)} className="p-3 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400 hover:text-slate-900">
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-10 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar-minimal">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại / Type</p>
                                    <p className="font-bold text-slate-900">{selectedIssue.product_type || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày / Date</p>
                                    <p className="font-bold text-slate-900">{formatDate(selectedIssue.detected_date)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số Lot/Lot No</p>
                                    <p className="font-bold text-slate-900">{selectedIssue.lot_no || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">T.Thái/Status</p>
                                    <div className="pt-1">
                                        <div className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider 
                                            ${selectedIssue.status === 'NEW' ? 'bg-rose-100 text-rose-700' :
                                                selectedIssue.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-emerald-100 text-emerald-700'}`}>
                                            {selectedIssue.status}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="space-y-6">
                                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên sản phẩm / Product Name</p>
                                    <p className="text-xl font-black text-slate-900">{selectedIssue.product_name}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mô tả lỗi / Defect</p>
                                        <div className="bg-rose-50/50 p-6 rounded-3xl border-2 border-rose-100 text-slate-700 font-bold leading-relaxed">
                                            {selectedIssue.defect_description}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Hướng / Resolution</p>
                                        <div className="bg-emerald-50/50 p-6 rounded-3xl border-2 border-emerald-100 text-emerald-800 font-bold leading-relaxed">
                                            {selectedIssue.resolution_direction || 'Chưa / None...'}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-6 rounded-3xl border-2 border-blue-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số lượng / Qty</p>
                                        <p className="text-2xl font-black text-blue-600">
                                            {Number(selectedIssue.quantity || 0).toLocaleString()} <span className="text-sm font-bold text-blue-400 uppercase">{selectedIssue.unit}</span>
                                        </p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm text-slate-400">
                                        <Clock size={24} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {selectedIssue.expiry_date && (
                                                        <div className="bg-amber-50/50 p-5 rounded-3xl border-2 border-amber-100">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hạn sử dụng / Expiry Date</p>
                                                            <p className="font-black text-amber-700 text-lg">{formatDate(selectedIssue.expiry_date)}</p>
                                                        </div>
                                                    )}
                                                    {selectedIssue.warehouse_entry_date && (
                                                        <div className="bg-emerald-50/50 p-5 rounded-3xl border-2 border-emerald-100">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày nhập kho / Warehouse Entry</p>
                                                            <p className="font-black text-emerald-700 text-lg">{formatDate(selectedIssue.warehouse_entry_date)}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Image Display in Detail Modal */}
                                                {selectedIssue.image_url && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                                            <ImageIcon size={14} /> Ảnh đính kèm / Attached Image
                                        </p>
                                        <div className="rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl">
                                            <img
                                                src={getImageSrc(selectedIssue.image_url)}
                                                alt="Issue evidence"
                                                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700 cursor-zoom-in"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={() => {
                                    setFormData({
                                        ...selectedIssue,
                                        year_id: selectedIssue.year_id || '',
                                        material_category_id: selectedIssue.material_category_id || '',
                                        detected_date: selectedIssue.detected_date ? selectedIssue.detected_date.split('T')[0] : '',
                                        received_date: selectedIssue.received_date ? selectedIssue.received_date.split('T')[0] : ''
                                    });
                                    setSelectedIssue(null);
                                    setShowModal(true);
                                }}
                                className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black hover:bg-blue-700 transition-all text-sm uppercase tracking-[0.2em]"
                            >
                                Cập nhật / Update
                            </button>
                            <button
                                onClick={() => setSelectedIssue(null)}
                                className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-black hover:bg-slate-800 transition-all text-sm uppercase tracking-[0.2em]"
                            >
                                Đóng / Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications Toast */}
            <div className="fixed top-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
                {notifications.map(notif => (
                    <div
                        key={notif.id}
                        className={`pointer-events-auto w-80 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-right-8 duration-500
                            ${notif.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'} text-white`}
                    >
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Bell size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 mt-1">
                            <p className="font-bold text-sm leading-snug">{notif.message}</p>
                        </div>
                        <button
                            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                            className="bg-transparent hover:bg-white/20 p-1.5 rounded-full transition-colors"
                        >
                            <X size={14} strokeWidth={3} />
                        </button>
                    </div>
                ))}
            </div>

        </div>
    );
}

export default App;
