import React, { useState } from 'react';
import { FileText, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createBirthdayGoogleDoc } from '../lib/googleDocs';

export function GoogleDocExport() {
  const [loading, setLoading] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setDocId(null);

    try {
      // 1. Fetch birthdays
      const res = await fetch('/api/birthdays');
      if (!res.ok) throw new Error('Помилка при отриманні списку іменинників');
      const data = await res.json();

      if (data.list.length === 0) {
        throw new Error('На цьому тижні немає іменинників');
      }

      // 2. Prepare content
      const UKR_DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
      let content = `ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ\n`;
      content += `(${data.weekRangeText})\n\n`;
      content += `--------------------------------------------------\n`;
      content += `День | Дата | ПІБ / Ім'я\n`;
      content += `--------------------------------------------------\n`;

      data.list.forEach((item: any) => {
        const dayName = UKR_DAYS[item.dayOfWeekNum];
        const dateFormatted = item.celebrationDate.split("-").reverse().join(".");
        const jubileeStr = item.isJubilee ? ' (Ювілей!)' : '';
        content += `${dayName} | ${dateFormatted} | ${item.cleanName || item.fullName}${jubileeStr}\n`;
      });

      content += `\n--------------------------------------------------\n`;
      content += `Згенеровано автоматично системою "База 777" - ${new Date().toLocaleString('uk-UA')}\n`;

      // 3. Create Google Doc
      const title = `Іменинники тижня (${data.weekRangeText})`;
      const id = await createBirthdayGoogleDoc(title, content);
      setDocId(id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Сталася невідома помилка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1a3843]/40 border border-[#224853] rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600/20 p-2 rounded-lg">
          <FileText className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h4 className="font-bold text-white text-sm">Експорт у Google Docs</h4>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Створіть документ Google Doc зі списком іменинників для зручного редагування та друку.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!docId ? (
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 outline-none shadow-sm shadow-blue-900/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Створення документа...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Створити Google Doc
              </>
            )}
          </button>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Документ створено успішно!
            </div>
            <a
              href={`https://docs.google.com/document/d/${docId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all outline-none"
            >
              <ExternalLink className="w-4 h-4" />
              Відкрити документ
            </a>
            <button 
              onClick={() => setDocId(null)}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline text-center"
            >
              Створити ще один
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-[10px] bg-rose-400/10 p-2 rounded border border-rose-400/20">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
