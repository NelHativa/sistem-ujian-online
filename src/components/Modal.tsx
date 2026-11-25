'use client';

export function Modal({
  children,
  onTutup,
  lebar = 'max-w-md',
  label,
}: {
  children: React.ReactNode;
  onTutup?: () => void;
  lebar?: string;
  label: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={label} onClick={onTutup}>
      <div className={`kartu w-full ${lebar} max-h-[90dvh] overflow-auto p-5 shadow-2xl`} onClick={(e) => e.stopPropagation()} data-masuk>
        {children}
      </div>
    </div>
  );
}
