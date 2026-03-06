import React from 'react';
import StatusBadge from './StatusBadge';

const IssueList = ({ issues }) => {
    return (
        <div className="overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl overflow-x-auto">
            <table className="min-w-full table-auto">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Loại SP</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lỗi phát hiện</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {issues.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-slate-400 font-medium">Chưa có dữ liệu sự cố</p>
                                    <p className="text-slate-300 text-xs">Vui lòng nhấn "Báo cáo mới" để thêm</p>
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
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${issue.product_type === 'Nguyên vật liệu' ? 'bg-blue-100 text-blue-700' :
                                            issue.product_type === 'repacking' ? 'bg-amber-100 text-amber-700' :
                                                issue.product_type === 'thành phẩm' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-slate-100 text-slate-600'
                                        }`}>
                                        {issue.product_type || 'Khác'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-slate-900">{issue.product_name}</div>
                                    <div className="text-xs text-slate-400 font-medium capitalize">
                                        {issue.issue_code ? `${issue.issue_code}` : `#${issue.id + 1000}`}
                                        {issue.lot_no ? ` • Lot: ${issue.lot_no}` : ''}
                                        {issue.MaterialCategory && ` • ${issue.MaterialCategory.name}`}
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

