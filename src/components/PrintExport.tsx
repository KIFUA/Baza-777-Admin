import React from 'react';
import { Printer, ExternalLink } from 'lucide-react';

export function PrintExport() {
  const handlePrint = () => {
    window.open('/api/birthdays/print', '_blank');
  };

  return (
    <div className="bg-[#1a3843]/40 border border-[#224853] rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-600/20 p-2 rounded-lg">
          <Printer className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h4 className="font-bold text-white text-sm">Версія для друку</h4>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Сформуйте чистий список іменинників для друку на принтері. Без зайвих елементів дизайну.
          </p>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all outline-none shadow-sm shadow-emerald-900/20"
      >
        <ExternalLink className="w-4 h-4" />
        Відкрити версію для друку
      </button>
    </div>
  );
}
