with open('src/components/StatsDashboard.tsx', 'r') as f:
    content = f.read()

target1 = '''  const [isHtmlGenerating, setIsHtmlGenerating] = useState<boolean>(false);
  const [showTotalRegisterStats, setShowTotalRegisterStats] = useState<boolean>(false);'''

replacement1 = '''  const [isHtmlGenerating, setIsHtmlGenerating] = useState<boolean>(false);
  const [showTotalRegisterStats, setShowTotalRegisterStats] = useState<boolean>(false);
  const [isContactJournalOpen, setIsContactJournalOpen] = useState<boolean>(false);'''

content = content.replace(target1, replacement1)

target2 = '''            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={handleDownloadHTML}'''

replacement2 = '''            <div className="flex items-center space-x-3 shrink-0">
              {selectedRayon !== "Всі райони" && selectedRayon !== "ВСІ РАЙОНИ" && (
                <button
                  onClick={() => setIsContactJournalOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-bold bg-[#1e40af] hover:bg-[#1d4ed8] text-white px-2.5 py-1 rounded-lg border border-blue-500/30 cursor-pointer shadow-sm transition-colors uppercase"
                >
                  <Activity className="h-3 w-3 shrink-0" />
                  Журнал контактів
                </button>
              )}
              <button
                onClick={handleDownloadHTML}'''

content = content.replace(target2, replacement2)

target3 = '''      {/* COMPACT PER-DISTRICT INDEPENDENT REPORT */}'''

replacement3 = '''      {/* Contact Journal Modal */}
      {isContactJournalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b171c] border border-[#204250] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#1a3843] border-b border-[#204250] px-4 py-3 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 p-1 rounded-md">
                  <Activity className="h-4 w-4" />
                </span>
                Журнал контактів - {selectedRayon}
              </h2>
              <button 
                onClick={() => setIsContactJournalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/50">
               <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1a3843]/50 border-b border-[#204250]">
                      <th className="p-2 text-emerald-400 font-semibold w-[50px] text-center">№</th>
                      <th className="p-2 text-emerald-400 font-semibold w-1/4">ПІБ</th>
                      <th className="p-2 text-emerald-400 font-semibold w-[120px]">Телефон</th>
                      <th className="p-2 text-emerald-400 font-semibold w-1/2">Історія контактів</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rayonMembers.filter(m => m.d_kontaktiv && m.d_kontaktiv.trim() && m.d_kontaktiv.trim() !== '—').map((m, idx) => (
                      <tr key={m.id} className="border-b border-[#204250]/50 hover:bg-slate-800/30">
                        <td className="p-2 font-mono text-slate-500 text-center">{idx + 1}</td>
                        <td className="p-2 font-medium text-slate-200">{m.pib}</td>
                        <td className="p-2 font-mono text-slate-400">{m.telefon_1 || '—'}</td>
                        <td className="p-2 text-slate-300 whitespace-pre-wrap leading-tight">{m.d_kontaktiv?.replace(/\\s*\\/\\s*/g, ', ')}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
               {rayonMembers.filter(m => m.d_kontaktiv && m.d_kontaktiv.trim() && m.d_kontaktiv.trim() !== '—').length === 0 && (
                 <div className="text-center text-slate-500 py-8 italic text-sm">
                    Немає записів про контакти у цьому районі.
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* COMPACT PER-DISTRICT INDEPENDENT REPORT */}'''

content = content.replace(target3, replacement3)

with open('src/components/StatsDashboard.tsx', 'w') as f:
    f.write(content)
print("Updated StatsDashboard successfully.")
