import React from 'react';

const StatusBadge = ({ status }) => {
    const colorMap = {
        'DONE': 'bg-emerald-500 shadow-emerald-100',
        'PENDING': 'bg-amber-500 shadow-amber-100',
        'IN_PROGRESS': 'bg-blue-500 shadow-blue-100',
        'NEW': 'bg-rose-500 shadow-rose-100'
    };

    const textMap = {
        'DONE': 'Hoàn thành',
        'PENDING': 'Chờ xử lý • Pending',
        'IN_PROGRESS': 'Đang xử lý',
        'NEW': 'Mới'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-md ${colorMap[status] || 'bg-slate-500'}`}>
            {textMap[status] || status}
        </span>
    );
};

export default StatusBadge;

