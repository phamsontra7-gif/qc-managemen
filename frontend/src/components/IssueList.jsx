import React from 'react';
import StatusBadge from './StatusBadge';
import { Camera } from 'lucide-react';

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
    return (
        <div className="overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl overflow-x-auto">
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
                    {issues.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-slate-400 font-medium">Chưa có dữ liệu / No Data</p>
                                    <p className="text-slate-300 text-xs">Vui lòng nhấn "Báo cáo mới" / Click "New Report" to add</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        issues.map(issue => (
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
                                        <div className="text-sm font-semibold text-slate-900">{issue.product_name}</div>
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
    );
};

export default IssueList;

