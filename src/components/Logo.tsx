export function Lambang({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true">
      <path d="M24 2 L45 9 V27 C45 41 35 50 24 54 C13 50 3 41 3 27 V9 Z" fill="#1E3A8A" stroke="#D4A017" strokeWidth="3" />
      <path d="M24 12 l3.2 6.6 7.2 1 -5.2 5 1.3 7.2 -6.5 -3.4 -6.5 3.4 1.3 -7.2 -5.2 -5 7.2 -1 z" fill="#D4A017" />
      <text x="24" y="47" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="Plus Jakarta Sans, sans-serif">
        BT
      </text>
    </svg>
  );
}

export function Merek({ subjudul, terang = false }: { subjudul?: string; terang?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Lambang />
      <div className="leading-tight">
        <div className={`font-heading text-[15px] font-bold ${terang ? 'text-white' : 'text-slate-900'}`}>Ujian SMAS Bina Taruna</div>
        {subjudul && <div className={`text-xs ${terang ? 'text-emas' : 'text-slate-500'}`}>{subjudul}</div>}
      </div>
    </div>
  );
}
