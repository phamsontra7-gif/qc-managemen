import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import API_BASE_URL from '../config';

const PRODUCT_TYPE_OPTIONS = [
    { value: 'Product', label: '🏭 Thành phẩm / Products' },
    { value: 'Ingredient', label: '🌾 Nguyên vật liệu / Ingredient' },
    { value: 'Repacking', label: '📦 Repacking' },
];

export default function ExcelImport({ onClose, getAuthHeader, onImportDone }) {
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [productType, setProductType] = useState('Product');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { success, skipped, errors, message }
    const fileInputRef = useRef();

    const handleFile = (f) => {
        if (!f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(ext)) {
            alert('Chỉ hỗ trợ file .xlsx hoặc .xls');
            return;
        }
        setFile(f);
        setResult(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        handleFile(f);
    };

    const handleImport = async () => {
        if (!file) { alert('Vui lòng chọn file Excel!'); return; }
        setLoading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('product_type', productType);

            const response = await fetch(`${API_BASE_URL}/api/import/excel`, {
                method: 'POST',
                headers: { ...getAuthHeader() },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                setResult({ success: 0, skipped: 0, errors: [data.error || 'Lỗi không xác định'], message: data.error });
            } else {
                setResult(data);
                if (onImportDone) onImportDone();
            }
        } catch (err) {
            setResult({ success: 0, skipped: 0, errors: [err.message], message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-200">
                            <FileSpreadsheet size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800">Import Báo Cáo Excel</h2>
                            <p className="text-[11px] text-slate-500 font-semibold">Tải lên file báo cáo hàng tháng</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Product Type Selector */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                            Phân loại sản phẩm / Folder
                        </label>
                        <div className="relative">
                            <select
                                value={productType}
                                onChange={e => setProductType(e.target.value)}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all cursor-pointer"
                            >
                                {PRODUCT_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                            Chọn folder tương ứng với file Excel bạn đang import
                        </p>
                    </div>

                    {/* File Upload Zone */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                            File Excel (.xlsx)
                        </label>
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
                                ${dragOver
                                    ? 'border-emerald-400 bg-emerald-50 scale-[1.01]'
                                    : file
                                        ? 'border-emerald-300 bg-emerald-50/50'
                                        : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={e => handleFile(e.target.files[0])}
                            />

                            {file ? (
                                <div className="space-y-2">
                                    <div className="flex justify-center">
                                        <div className="bg-emerald-100 p-3 rounded-2xl">
                                            <FileSpreadsheet size={32} className="text-emerald-600" />
                                        </div>
                                    </div>
                                    <p className="font-black text-slate-700 text-sm">{file.name}</p>
                                    <p className="text-[11px] text-slate-400 font-semibold">
                                        {(file.size / 1024).toFixed(1)} KB — Click để chọn file khác
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-center">
                                        <div className={`p-3 rounded-2xl transition-all ${dragOver ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                            <Upload size={28} className={dragOver ? 'text-emerald-500' : 'text-slate-400'} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-600 text-sm">
                                            Kéo thả file vào đây
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-semibold mt-1">
                                            hoặc click để chọn file .xlsx / .xls
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {['2025.07.xlsx', '2025.08.xlsx', '2025.12.xlsx'].map(ex => (
                                            <span key={ex} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                {ex}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Format hint */}
                    <div className="bg-blue-50 rounded-xl p-3 text-[11px] text-blue-700 font-semibold space-y-1">
                        <p className="font-black text-blue-800">📋 Lưu ý về cấu trúc file Excel:</p>
                        <p>• Tên file: <span className="font-black">2025.07.xlsx</span> (năm.tháng)</p>
                        <p>• Tên sheet: ngày phát hiện (vd: <span className="font-black">01.12</span>, <span className="font-black">15</span>)</p>
                        <p>• Cột: MFD, Lot No, Ngày nhập kho, Ngày PH, Tên SP, Nguyên nhân, SL (KG), Khắc phục</p>
                        <p>• Issue code sẽ được tự động tạo theo chuẩn hệ thống</p>
                    </div>

                    {/* Result */}
                    {result && (
                        <div className={`rounded-xl p-4 ${result.success > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {result.success > 0 || result.skipped > 0
                                    ? <CheckCircle2 size={18} className="text-emerald-600" />
                                    : <AlertCircle size={18} className="text-rose-500" />
                                }
                                <p className="font-black text-sm text-slate-700">{result.message}</p>
                            </div>
                            <div className="flex gap-4 text-[11px] font-bold">
                                <span className="text-emerald-700">✅ Tạo mới: {result.success}</span>
                                <span className="text-amber-600">⏭️ Bỏ qua: {result.skipped}</span>
                                <span className="text-rose-600">❌ Lỗi: {result.errors?.length || 0}</span>
                            </div>
                            {result.errors?.length > 0 && (
                                <div className="mt-2 max-h-28 overflow-y-auto">
                                    {result.errors.map((e, i) => (
                                        <p key={i} className="text-[10px] text-rose-600 font-semibold">{e}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-black text-sm text-slate-600 border-2 border-slate-200 hover:bg-slate-50 transition-all"
                    >
                        Đóng / Close
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || loading}
                        className={`flex-1 py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg
                            ${file && !loading
                                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 hover:-translate-y-0.5 active:scale-95'
                                : 'bg-slate-300 cursor-not-allowed'
                            }`}
                    >
                        {loading ? (
                            <><Loader2 size={18} className="animate-spin" /> Đang import...</>
                        ) : (
                            <><Upload size={18} /> Xác nhận Import</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
