import React, { useState } from 'react';
import { Member } from '../types';
import { Shield, Users, MapPin, UserCheck, ArrowRight } from 'lucide-react';

interface PastoralCareProps {
  members: Member[];
  onSelectMember: (id: number) => void;
}

export default function PastoralCareManager({ members, onSelectMember }: PastoralCareProps) {
  // Group active members by caretaker/presbyter
  const activeMembers = members.filter(m => m.id_vybuttya === 0);
  
  const groups: Record<string, Member[]> = {};
  activeMembers.forEach(m => {
    const caretaker = m.presviter || "Опікун не призначений";
    if (!groups[caretaker]) {
      groups[caretaker] = [];
    }
    groups[caretaker].push(m);
  });

  const [selectedCaretaker, setSelectedCaretaker] = useState<string>(Object.keys(groups)[0] || '');

  // Sort caretakers by count descending
  const caretakersList = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  return (
    <div id="pastoral_care_manager" className="space-y-6 animate-fade-in">
      
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Душпастирська Опіка та Відповідальність</h2>
        <p className="text-sm text-slate-500">Спеціальні списки підопічних членів, сформовані за відповідальними служителями / пресвітерами</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        
        {/* Caregivers selector list */}
        <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2">
            Служителі та Опікуни
          </span>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {caretakersList.map(cg => {
              const count = groups[cg].length;
              const isSelected = selectedCaretaker === cg;
              return (
                <button
                  key={cg}
                  onClick={() => setSelectedCaretaker(cg)}
                  className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors text-left ${isSelected ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Shield className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-blue-500"}`} />
                    <span className="truncate">{cg}</span>
                  </div>
                  <span className={`inline-flex rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold ${isSelected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subordinates Table Grid list detail */}
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-3">
          
          {selectedCaretaker ? (
            <div className="space-y-6">
              
              {/* Header card */}
              <div className="rounded-xl bg-slate-50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Профайл духовного наставника:</div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{selectedCaretaker}</h3>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-100 w-fit">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>У підпорядкуванні:</span>
                  <span className="font-bold text-slate-900">{groups[selectedCaretaker]?.length || 0} членів</span>
                </div>
              </div>

              {/* Subordinate list table */}
              <div className="overflow-x-auto text-xs">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">ПІБ Члена Церкви</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Стать</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Вік</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Район (rayon2)</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Характеристики</th>
                      <th scope="col" className="relative px-4 py-3">
                        <span className="sr-only">Дії</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {groups[selectedCaretaker]?.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="font-bold text-slate-900">{m.pib}</div>
                          <div className="text-[10px] font-medium text-slate-400">{m.tel_mob || 'Телефон відсутній'}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${m.stat === 'брат' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
                            {m.stat}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 px-4 font-mono font-semibold text-slate-600">
                          {m.vik_rokiv1 || 'н/д'} р.
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="flex items-center space-x-1 font-medium text-slate-700">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span>{m.rayon2_ukr || 'н/д'}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 space-y-1">
                          {m.vidviduvanist && (
                            <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 mr-1">
                              {m.vidviduvanist}
                            </span>
                          )}
                          {m.prysutnist && (
                            <span className="inline-block rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                              {m.prysutnist}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium">
                          <button
                            onClick={() => onSelectMember(m.id)}
                            className="flex items-center space-x-1 rounded px-2.5 py-1 text-slate-600 hover:text-blue-600 font-bold outline-none"
                          >
                            <span>Картка</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div className="text-center text-xs text-slate-400 italic py-12">
              Немає завантажених опікунів. Перевірте базу.
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
