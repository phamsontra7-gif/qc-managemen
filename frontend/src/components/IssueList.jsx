import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import { Camera, Search, X, Download } from 'lucide-react';
import API_BASE_URL from '../config';

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

const IssueList = ({ issues, onSelectIssue }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredIssues = searchQuery.trim()
        ? issues.filter(issue =>
            issue.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : issues;

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên sản phẩm / Search by product name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-400 outline-none bg-white text-sm font-semibold text-slate-700 placeholder:text-slate-300 shadow-sm transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            <X size={15} strokeWidth={3} />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
                        {filteredIssues.length} kết quả / results
                    </span>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl overflow-x-auto">
                <table className="min-w-full table-auto">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Phân loại / Type</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã / Code</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày / Date</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm / Product</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lỗi / Defect</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SL / Qty</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Thái / Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredIssues.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        {searchQuery ? (
                                            <>
                                                <Search size={32} className="text-slate-200" />
                                                <p className="text-slate-400 font-bold">Không tìm thấy sản phẩm "<span className="text-blue-500">{searchQuery}</span>"</p>
                                                <p className="text-slate-300 text-xs">No results found · Try a different keyword</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-slate-400 font-medium">Chưa có dữ liệu / No Data</p>
                                                <p className="text-slate-300 text-xs">Vui lòng nhấn "Báo cáo mới" / Click "New Report" to add</p>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredIssues.map(issue => (
                                <tr
                                    key={issue.id}
                                    className={`hover:bg-blue-50/50 transition-all duration-200 ${issue.status === 'NEW' ? 'bg-rose-50/30' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${issue.product_type?.includes('Nguyên Vật Liệu') ? 'bg-blue-100 text-blue-700' :
                                            issue.product_type === 'Repacking' ? 'bg-amber-100 text-amber-700' :
                                                issue.product_type?.includes('Thành phẩm') ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {issue.product_type || 'Khác'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => onSelectIssue(issue)}
                                            className="text-sm font-black text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm hover:shadow-md"
                                        >
                                            {issue.issue_code || `#${String(issue.id).padStart(4, '0')}`}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                                        {formatDate(issue.detected_date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold text-slate-900">
                                                {/* Highlight matching text */}
                                                {searchQuery && issue.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                                    (() => {
                                                        const idx = issue.product_name.toLowerCase().indexOf(searchQuery.toLowerCase());
                                                        return (
                                                            <>
                                                                {issue.product_name.slice(0, idx)}
                                                                <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{issue.product_name.slice(idx, idx + searchQuery.length)}</mark>
                                                                {issue.product_name.slice(idx + searchQuery.length)}
                                                            </>
                                                        );
                                                    })()
                                                ) : issue.product_name}
                                            </div>
                                            {issue.image_url && <Camera size={14} className="text-blue-500" title="Có ảnh đính kèm" />}
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium capitalize">
                                            {issue.lot_no ? `Lot: ${issue.lot_no} • ` : ''}
                                            {issue.Year && `Năm ${issue.Year.year}`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600 line-clamp-2 max-w-md">
                                            {issue.defect_description}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-700">
                                            {issue.quantity ? Number(issue.quantity).toLocaleString() : '0'}
                                            <span className="text-slate-400 font-medium ml-1">{issue.unit || 'kg'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={issue.status} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredIssues.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-8 text-center mt-4">
                        <div className="flex flex-col items-center gap-2">
                            {searchQuery ? (
                                <>
                                    <Search size={32} className="text-slate-200 mx-auto" />
                                    <p className="text-slate-400 font-bold">Không tìm thấy sản phẩm "<span className="text-blue-500">{searchQuery}</span>"</p>
                                    <p className="text-slate-300 text-xs">No results found · Try a different keyword</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-slate-400 font-medium">Chưa có dữ liệu / No Data</p>
                                    <p className="text-slate-300 text-xs">Vui lòng nhấn "Báo cáo mới" / Click "New Report" to add</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    filteredIssues.map((issue) => (
                        <div 
                            key={issue.id} 
                            onClick={() => onSelectIssue(issue)}
                            className={`bg-white backdrop-blur-md rounded-2xl border shadow-md p-5 mt-4 space-y-4 active:scale-[0.98] transition-all duration-200 cursor-pointer ${issue.status === 'NEW' ? 'border-rose-100 bg-rose-50/20 shadow-rose-100/50' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex flex-col gap-2.5 items-start">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${issue.product_type?.includes('Nguyên Vật Liệu') ? 'bg-blue-100 text-blue-700' :
                                        issue.product_type === 'Repacking' ? 'bg-amber-100 text-amber-700' :
                                            issue.product_type?.includes('Thành phẩm') ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {issue.product_type || 'Khác'}
                                    </span>
                                    <button 
                                        className="text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 hover:shadow-md transition-shadow"
                                    >
                                        {issue.issue_code || `#${String(issue.id).padStart(4, '0')}`}
                                    </button>
                                </div>
                                <div className="bg-slate-50 px-2 py-1.5 rounded-md border border-slate-100">
                                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                                        {formatDate(issue.detected_date)}
                                    </span>
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-start gap-2">
                                    <div className="text-base font-extrabold text-slate-900 leading-snug">
                                        {searchQuery && issue.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                            (() => {
                                                const idx = issue.product_name.toLowerCase().indexOf(searchQuery.toLowerCase());
                                                return (
                                                    <>
                                                        {issue.product_name.slice(0, idx)}
                                                        <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{issue.product_name.slice(idx, idx + searchQuery.length)}</mark>
                                                        {issue.product_name.slice(idx + searchQuery.length)}
                                                    </>
                                                );
                                            })()
                                        ) : issue.product_name}
                                    </div>
                                    {issue.image_url && <Camera size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />}
                                </div>
                                <div className="text-xs text-slate-400 font-semibold mt-1">
                                    {issue.lot_no ? `Lot: ${issue.lot_no} • ` : ''}
                                    {issue.Year && `Năm ${issue.Year.year}`}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50 relative">
                                <span className="absolute -top-2 -left-1 text-2xl text-slate-200 font-serif opacity-50">"</span>
                                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed relative z-10 pl-2">
                                    {issue.defect_description || <span className="italic text-slate-400">Không có mô tả / No description</span>}
                                </p>
                            </div>

                            <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Số lượng / QTY</span>
                                    <div className="text-lg font-black text-slate-800 leading-none">
                                        {issue.quantity ? Number(issue.quantity).toLocaleString() : '0'}
                                        <span className="text-slate-500 font-bold ml-1.5 text-xs uppercase">{issue.unit || 'kg'}</span>
                                    </div>
                                </div>
                                <div className="mb-0.5">
                                    <StatusBadge status={issue.status} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default IssueList;
