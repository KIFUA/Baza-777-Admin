import React, { useState, useEffect } from 'react';
import { Member } from './types';
import StatsDashboard from './components/StatsDashboard';
import PastoralCareManager from './components/PastoralCareManager';
import HistoryJournal from './components/HistoryJournal';
import MemberProfile from './components/MemberProfile';
import MemberForm from './components/MemberForm';
import { 
  Users, UserCheck, Heart, Shield, History, BarChart3, Search, 
  MapPin, Phone, UserPlus, Filter, RotateCcw, ChevronLeft, ChevronRight, BookOpen
} from 'lucide-react';

export default function App() {
  // System State
  const [members, setMembers] = useState<Member[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'pastoral' | 'history' | 'stats'>('members');

  // Directory Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // default to 'active' for church management!
  const [caregiverFilter, setCaregiverFilter] = useState('');

  // Active Selected Context
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Build search query url params
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (genderFilter) params.append('gender', genderFilter);
      if (areaFilter) params.append('area', areaFilter);
      if (groupFilter) params.append('group', groupFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (caregiverFilter) params.append('caretaker', caregiverFilter);

      const resp = await fetch(`/api/members?${params.toString()}`);
      if (resp.ok) {
        const json = await resp.json();
        setMembers(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupsAndStats = async () => {
    try {
      const lookResp = await fetch('/api/lookups');
      if (lookResp.ok) {
        const lookJson = await lookResp.json();
        setLookups(lookJson);
      }
      
      const statsResp = await fetch('/api/stats');
      if (statsResp.ok) {
        const statsJson = await statsResp.json();
        setStats(statsJson);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMembers();
    setCurrentPage(1); // reset to page 1 on filter changes
  }, [searchQuery, genderFilter, areaFilter, groupFilter, statusFilter, caregiverFilter]);

  useEffect(() => {
    fetchLookupsAndStats();
  }, []);

  const handleResetFilters = () => {
    setSearchQuery('');
    setGenderFilter('');
    setAreaFilter('');
    setGroupFilter('');
    setStatusFilter('active');
    setCaregiverFilter('');
  };

  // Create or Update form save callback
  const handleSaveMember = async (data: Partial<Member>) => {
    try {
      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members';
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (resp.ok) {
        const resJson = await resp.json();
        setShowForm(false);
        setEditingMember(null);
        
        // Refresh
        await fetchMembers();
        await fetchLookupsAndStats();
        
        if (!editingMember && resJson.memberId) {
          // If created new, navigate to details immediately
          setSelectedMemberId(resJson.memberId);
        } else if (editingMember) {
          // Keep active view open
          setSelectedMemberId(editingMember.id);
        }
      } else {
        alert("Помилка під час збереження профайлу.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Navigate to spouse or related member from links
  const handleNavigateToMember = (id: number) => {
    setSelectedMemberId(id);
    setShowForm(false);
    setEditingMember(null);
  };

  // Determine Unique Lists for Filter dropdowns dynamically from lookups or master records
  const getUniqueAreas = () => {
    if (lookups?.selo) {
      // Can extract distinct area labels or custom ones
    }
    const set = new Set(members.map(m => m.rayon2_ukr).filter(Boolean));
    return Array.from(set).sort();
  };

  const getUniqueGroups = () => {
    const set = new Set(members.map(m => m.n_dilyci).filter(Boolean));
    return Array.from(set).sort();
  };

  const getUniqueCaregivers = () => {
    const set = new Set(members.map(m => m.presviter).filter(Boolean));
    return Array.from(set).sort();
  };

  // Calculate Paginated slice of members
  const totalRecords = members.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMembers = members.slice(startIndex, startIndex + pageSize);

  const activeStatsCount = members.filter(m => m.id_vybuttya === 0).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased">
      
      {/* 1. CHURCH PORTAL HEADER */}
      <header className="bg-slate-900 text-white shrink-0 sticky top-0 z-10 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="bg-blue-600 rounded-xl p-2.5 shadow-md flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg md:text-xl font-bold tracking-tight">Церковний Реєстр «Служитель»</h1>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium">Система обліку, душпастирської опіки та хроніки громади</p>
            </div>
          </div>

          {/* Quick tab nav buttons */}
          <nav className="flex space-x-1.5 bg-slate-800/80 rounded-xl p-1.5 border border-slate-700">
            <button
              onClick={() => { setActiveTab('members'); setSelectedMemberId(null); setShowForm(false); }}
              className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all outline-none ${activeTab === 'members' && !selectedMemberId && !showForm ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Реєстр</span>
            </button>
            <button
              onClick={() => { setActiveTab('pastoral'); setSelectedMemberId(null); setShowForm(false); }}
              className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all outline-none ${activeTab === 'pastoral' ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Аналіз Опіки</span>
            </button>
            <button
              onClick={() => { setActiveTab('history'); setSelectedMemberId(null); setShowForm(false); }}
              className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all outline-none ${activeTab === 'history' ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Журнал Хронік</span>
            </button>
            <button
              onClick={() => { setActiveTab('stats'); setSelectedMemberId(null); setShowForm(false); }}
              className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all outline-none ${activeTab === 'stats' ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Зрізи</span>
            </button>
          </nav>
        </div>
      </header>

      {/* 2. MAIN HUB CANVAS CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 lg:px-8 py-6 overflow-hidden flex flex-col">
        
        {/* Detail Visualizer or Edit forms overlay views */}
        {selectedMemberId !== null ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedMemberId(null)}
              className="group flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest pl-1 py-1"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Вернутись до списку</span>
            </button>
            <div className="bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm">
              <MemberProfile
                memberId={selectedMemberId}
                onClose={() => setSelectedMemberId(null)}
                onEdit={(m) => { setEditingMember(m); setShowForm(true); setSelectedMemberId(null); }}
                onNavigateToMember={handleNavigateToMember}
                lookups={lookups}
              />
            </div>
          </div>
        ) : showForm ? (
          <div className="space-y-4">
            <button
              onClick={() => { setShowForm(false); setEditingMember(null); }}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest pl-1 py-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>До списку членів</span>
            </button>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <MemberForm
                member={editingMember}
                lookups={lookups}
                onSave={handleSaveMember}
                onCancel={() => { setShowForm(false); setEditingMember(null); }}
              />
            </div>
          </div>
        ) : (
          /* General Hub selectors switcher */
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'members' && (
              <div className="flex-1 flex flex-col space-y-6">
                
                {/* Visual statistics ribbon */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Реєстр картотеки членів церкви</h2>
                    <p className="text-xs text-slate-500 font-medium">Пошук, фільтрація та налаштування персональних даних</p>
                  </div>
                  <button
                    onClick={() => { setEditingMember(null); setShowForm(true); }}
                    className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Додати нового члена</span>
                  </button>
                </div>

                {/* Filters control block panel */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-4">
                  
                  {/* Row 1: Search & Statuses */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    
                    {/* Search query input */}
                    <div className="relative md:col-span-2">
                      <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Пошук за PIB, телефоном або професією..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Gender selector */}
                    <div>
                      <select
                        value={genderFilter}
                        onChange={(e) => setGenderFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-none bg-white font-medium text-slate-600"
                      >
                        <option value="">Всі статі / Ролі</option>
                        <option value="брат">брат</option>
                        <option value="сестра">сестра</option>
                      </select>
                    </div>

                    {/* Status filter (Vybuttya context) */}
                    <div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-none bg-white font-medium text-slate-600"
                      >
                        <option value="">Весь архівний облік</option>
                        <option value="active">Активний член церкви</option>
                        <option value="dismissed">Знято з обліку (вибув)</option>
                      </select>
                    </div>

                  </div>

                  {/* Row 2: Structural Areas, Dilytsya & Caregivers */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    
                    {/* Area filters */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Район:</span>
                      <select
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-1.5 text-xs bg-white font-medium"
                      >
                        <option value="">Всі райони</option>
                        {getUniqueAreas().map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    {/* Group filters */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Дільниця:</span>
                      <select
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-1.5 text-xs bg-white font-medium"
                      >
                        <option value="">Всі дільниці</option>
                        {getUniqueGroups().map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    {/* Oversight Caregiver filters */}
                    <div className="flex items-center space-x-2 sm:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Опіка:</span>
                      <select
                        value={caregiverFilter}
                        onChange={(e) => setCaregiverFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-1.5 text-xs bg-white font-medium"
                      >
                        <option value="">Всі опікуни</option>
                        {getUniqueCaregivers().map(ao => (
                          <option key={ao} value={ao}>{ao}</option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* Filter actions footer */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[10px] text-slate-400 font-semibold">
                    <span>
                      Знайдено записів відповідно до фільтрації: <b className="text-slate-700 text-xs">{totalRecords}</b> членів
                    </span>
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer uppercase tracking-widest"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Скинути фільтри</span>
                    </button>
                  </div>

                </div>

                {/* Directory Spreadsheet Master Table List */}
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                    <span className="text-xs text-slate-400 font-bold tracking-widest uppercase animate-pulse">Зчитування даних з картотеки...</span>
                  </div>
                ) : paginatedMembers.length > 0 ? (
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    
                    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm flex-1">
                      <table className="min-w-full divide-y divide-slate-100 text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th scope="col" className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">ПІБ та Телефон</th>
                            <th scope="col" className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Стать</th>
                            <th scope="col" className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Вік</th>
                            <th scope="col" className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Адреса та Район</th>
                            <th scope="col" className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Група / Опікун</th>
                            <th scope="col" className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Характеристики</th>
                            <th scope="col" className="relative px-5 py-3.5">
                              <span className="sr-only">Дії</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium">
                          {paginatedMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => setSelectedMemberId(m.id)}>
                              
                              {/* Name & phone */}
                              <td className="whitespace-nowrap px-5 py-3">
                                <div className="font-bold text-sm text-slate-900">{m.pib}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{m.tel_mob || m.tel1 || 'Телефон не вказаний'}</div>
                              </td>

                              {/* Gender badge */}
                              <td className="whitespace-nowrap px-5 py-3">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${m.stat === 'брат' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {m.stat}
                                </span>
                              </td>

                              {/* Calculated age */}
                              <td className="whitespace-nowrap px-5 py-3 font-mono text-slate-500">
                                {m.vik_rokiv1 ? `${m.vik_rokiv1} р.` : 'н/д'}
                              </td>

                              {/* Area structural (rayon2) */}
                              <td className="whitespace-nowrap px-5 py-3">
                                <div className="flex items-center space-x-1 text-slate-700">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{m.rayon2_ukr || 'н/д р-н'}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal pl-5">{m.s_selo_ukr || ''} {m.s_vulicya_ukr || ''}</div>
                              </td>

                              {/* Care presbyter/Group */}
                              <td className="whitespace-nowrap px-5 py-3">
                                <div className="text-slate-800">{m.n_dilyci || m.id_dilnicya}</div>
                                <div className="text-[10px] text-blue-600 font-semibold">{m.presviter || 'Опіка не розписана'}</div>
                              </td>

                              {/* Specific tagging (Requests 8 & 9) */}
                              <td className="whitespace-nowrap px-5 py-3 space-y-1">
                                {m.vidviduvanist && (
                                  <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 mr-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                    {m.vidviduvanist}
                                  </span>
                                )}
                                {m.prysutnist && (
                                  <span className="inline-block rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                    {m.prysutnist}
                                  </span>
                                )}
                                {m.id_vybuttya > 0 && (
                                  <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                                    🔴 Вибув
                                  </span>
                                )}
                              </td>

                              <td className="whitespace-nowrap px-5 py-3 text-right">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedMemberId(m.id); }}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                                >
                                  Справа
                                </button>
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination control panel footer */}
                    <div className="flex items-center justify-between border-t border-slate-100 bg-white shadow-sm rounded-2xl p-4 text-xs font-semibold text-slate-500">
                      <div className="flex items-center space-x-2">
                        <span>На сторінці:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                          className="rounded border border-slate-200 p-1 bg-white"
                        >
                          <option value="15">15</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        <span className="text-[10px] font-normal text-slate-400">Показано {startIndex + 1} - {Math.min(startIndex + pageSize, totalRecords)} із {totalRecords} записів</span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-slate-700">Сторінка <b>{currentPage}</b> з {totalPages || 1}</span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages || totalPages === 0}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center text-xs text-slate-400 italic">
                    У церковному архіві за вибраними фільтрами не знайдено жодного члена церкви. Спробуйте змінити критерії пошуку.
                  </div>
                )}

              </div>
            )}

            {activeTab === 'pastoral' && (
              <PastoralCareManager 
                members={members} 
                onSelectMember={(id) => { setSelectedMemberId(id); setActiveTab('members'); }} 
              />
            )}

            {activeTab === 'history' && (
              <HistoryJournal 
                onSelectMember={(id) => { setSelectedMemberId(id); setActiveTab('members'); }} 
              />
            )}

            {activeTab === 'stats' && (
              <StatsDashboard 
                stats={stats} 
                members={members} 
              />
            )}
          </div>
        )}

      </main>

      {/* 3. PORTAL FOOTER CREDENTIAL INDICATOR */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-[10px] font-mono text-center py-3.5 mt-auto">
        Архівно-адміністративний кабінет громади • Версія Громади №2.5 (Access Migrated Engine) • {new Date().getFullYear()}
      </footer>

    </div>
  );
}
