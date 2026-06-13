import React, { useState, useEffect, useRef } from 'react';
import { Member } from './types';
import StatsDashboard from './components/StatsDashboard';
import PastoralCareManager from './components/PastoralCareManager';
import HistoryJournal from './components/HistoryJournal';
import MemberProfile from './components/MemberProfile';
import MemberForm from './components/MemberForm';
import SpreadsheetView from './components/SpreadsheetView';
import DirectoriesManager from './components/DirectoriesManager';
import ReportGenerator from './components/ReportGenerator';
import { 
  Users, UserCheck, Heart, Shield, History, BarChart3, Search, 
  MapPin, Phone, UserPlus, Filter, RotateCcw, ChevronLeft, ChevronRight, BookOpen,
  Table2, X
} from 'lucide-react';

export default function App() {
  // System State
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spreadsheetLoading, setSpreadsheetLoading] = useState(true);
  
  // High level UI Modes: 'spreadsheet' (СПИСОК) or 'questionnaire' (АНКЕТИ) or 'generator' (ГЕНЕРАТОР) or 'settings' (НАЛАШТУВАННЯ)
  const [mainMode, setMainMode] = useState<'spreadsheet' | 'questionnaire' | 'generator' | 'settings'>('spreadsheet');
  const [activeTab, setActiveTab] = useState<'members' | 'pastoral' | 'history' | 'stats'>('members');

  // Interactive local session simulator based on Google Sheet tab "ДОСТУП"
  const [currentSessionUser, setCurrentSessionUser] = useState<any>(null);

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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      setIsAdmin(localStorage.getItem("user_tg_id") === "969538290");
    };
    checkAdmin();
    const interval = setInterval(checkAdmin, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchMembers = async () => {
    if (members.length === 0) {
      setLoading(true);
    }
    try {
      // Build search query url params
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (genderFilter) params.append('gender', genderFilter);
      
      // Force rayon segment constraint if restricted session is active
      const targetRayon = currentSessionUser?.rayon || areaFilter;
      if (targetRayon) params.append('area', targetRayon);

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

  const fetchAllMembers = async () => {
    if (allMembers.length === 0) {
      setSpreadsheetLoading(true);
    }
    try {
      const resp = await fetch('/api/members?status='); // empty status returns all records
      if (resp.ok) {
        const json = await resp.json();
        setAllMembers(json);
      }
    } catch (err) {
      console.error("Error loading spreadsheet members:", err);
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const fetchLookupsAndStats = async () => {
    try {
      const lookResp = await fetch('/api/lookups');
      if (lookResp.ok) {
        const lookJson = await lookResp.json();
        setLookups(lookJson);
        (window as any).__bazaLookupsData = lookJson;
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

  const preloadRawFirebase = async () => {
    try {
      const res = await fetch('/api/firebase/members.json');
      if (res.ok) {
        const data = await res.json();
        (window as any).__bazaRawFirebaseData = data;
        console.log("Preloaded/Refreshed raw firebase database successfully");
      }
    } catch (err) {
      console.error("Failed to preload raw firebase database:", err);
    }
  };

  useEffect(() => {
    fetchMembers();
    setCurrentPage(1); // reset to page 1 on filter changes
  }, [searchQuery, genderFilter, areaFilter, groupFilter, statusFilter, caregiverFilter, currentSessionUser]);

  const syncCallbackRef = useRef<any>(null);
  syncCallbackRef.current = async () => {
    try {
      await fetch('/api/members/invalidate-cache', { method: 'POST' });
    } catch (e) {
      console.error("Failed to notify invalidate-cache:", e);
    }
    await fetchAllMembers();
    await fetchMembers();
    await fetchLookupsAndStats();
    await preloadRawFirebase();
  };

  useEffect(() => {
    fetchLookupsAndStats();
    fetchAllMembers();
    preloadRawFirebase();

    (window as any).__bazaNotifyDatabaseChanged = async () => {
      console.log("[Parent Sync Event] Database changed. Reloading all states...");
      if (syncCallbackRef.current) {
        await syncCallbackRef.current();
      }
    };

    return () => {
      delete (window as any).__bazaNotifyDatabaseChanged;
    };
  }, []);



  const handleSpreadsheetUpdate = async (id: number, updatedFields: Partial<Member>) => {
    try {
      const resp = await fetch(`/api/members/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (resp.ok) {
        // Optimistically update both sets of data in react state
        setAllMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedFields } : m));
        setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedFields } : m));
        await fetchLookupsAndStats();
        await preloadRawFirebase();
        return true;
      }
    } catch (err) {
      console.error("Error saving inline spreadsheet update:", err);
    }
    alert("Помилка під час швидкого збереження.");
    return false;
  };

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
        await fetchAllMembers();
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
    <div className="h-screen flex flex-col font-sans select-none antialiased overflow-hidden" style={{ backgroundColor: '#264653' }}>
      
      <div className="w-full max-w-[1100px] mx-auto flex flex-col h-full min-h-0 px-4">
        {/* SLIM TOP BAR (MIMICKING PHOTO 1) */}
        <div className="text-white py-1.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 border-b border-[#203a45] shrink-0">
          <div className="flex gap-1.5 sm:gap-4 items-center justify-between sm:justify-start w-full sm:w-auto min-w-0">
            <div className="text-[8px] sm:text-[10px] font-bold text-slate-300 leading-tight shrink-0">
              СЬОГОДНІ: {new Date().toLocaleDateString('uk-UA')}<br/>
              ОНОВЛЕНО: {new Date().toLocaleTimeString('uk-UA')}
            </div>
            
            <div className="bg-[#1a3843] border border-[#142d36] rounded px-1 py-0.5 sm:rounded-md sm:px-4 sm:py-1.5 flex text-[7.5px] sm:text-xs font-bold uppercase tracking-wider text-[#cfdfe2] items-center whitespace-nowrap">
              <span className="hidden sm:inline mr-2">ВСЬОГО ЧЛЕНІВ ЦЕРКВИ</span>
              <span className="sm:hidden mr-1">ВСЬОГО</span>
              <span className="font-black text-[10px] sm:text-sm text-white">{members.length}</span>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-2 shrink-0 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={() => { 
                setMainMode('spreadsheet'); 
                setSelectedMemberId(null); 
                setShowForm(false); 
                // Instant load using cache, reload synced changes in background in parallel
                Promise.all([
                  fetchAllMembers(),
                  fetchMembers(),
                  fetchLookupsAndStats()
                ]).catch(err => console.error("Error updating tab data:", err));
              }}
              className={`px-2 sm:px-5 py-1 sm:py-2 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'spreadsheet' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
            >
              СПИСОК
            </button>
            <button
              title="Перейти до анкет"
              onClick={() => { 
                setMainMode('questionnaire'); 
                setSelectedMemberId(null); 
                setShowForm(false); 
                // Instant load using cache, reload synced changes in background in parallel
                Promise.all([
                  fetchAllMembers(),
                  fetchMembers(),
                  fetchLookupsAndStats()
                ]).catch(err => console.error("Error updating tab data:", err));
              }}
              className={`px-2 sm:px-5 py-1 sm:py-2 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'questionnaire' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
            >
              АНКЕТИ
            </button>
            <button
              className="px-1.5 sm:px-5 py-1 sm:py-2 text-[10px] sm:text-xs font-bold rounded-md tracking-wider uppercase bg-[#1a3843] text-slate-400 opacity-50 cursor-not-allowed"
            >
              СТАТ-КА
            </button>
          </nav>
        </div>

        {/* 2. MAIN HUB CANVAS CONTENT */}
        <main className="flex-1 min-h-0 w-full pb-2 flex flex-col">
        
        {/* Detail Visualizer or Edit forms overlay views */}
        {(selectedMemberId !== null && mainMode !== 'questionnaire') ? (
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
                onUpdateMember={handleSpreadsheetUpdate}
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
            {mainMode === 'spreadsheet' ? (
              spreadsheetLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
                  <span className="text-xs text-slate-400 font-bold tracking-widest uppercase animate-pulse">Зчитування даних таблиці...</span>
                </div>
              ) : (
                <SpreadsheetView
                  members={allMembers}
                  lookups={lookups}
                  onOpenProfile={async (id) => {
                    setSelectedMemberId(id);
                    setMainMode('questionnaire');
                  }}
                  onUpdateMember={handleSpreadsheetUpdate}
                  onOpenGenerator={() => {
                    setMainMode('generator');
                    setSelectedMemberId(null);
                    setShowForm(false);
                    Promise.all([
                      fetchAllMembers(),
                      fetchMembers(),
                      fetchLookupsAndStats()
                    ]).catch(err => console.error("Error updating tab data:", err));
                  }}
                />
              )
            ) : mainMode === 'questionnaire' ? (
              /* Questionnaire Legacy Embedded View */
              <div className="flex-1 flex flex-col min-h-[450px] bg-[#333333] overflow-hidden -mx-2 -mb-2 rounded-t-lg border-t border-[#1a3843]">
                {!isAdmin && !selectedMemberId ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-zinc-500 text-[11px] font-normal tracking-wide">
                      Ці записи тільки для адміністратора
                    </p>
                  </div>
                ) : (
                  <iframe 
                    src={`/index_legacy.html?merge=before${selectedMemberId ? `&id=${selectedMemberId}` : ''}`} 
                    className="w-full h-full border-0 flex-1" 
                    title="Legacy Questionnaire"
                  ></iframe>
                )}
              </div>
            ) : mainMode === 'generator' ? (
              <ReportGenerator
                members={allMembers}
                lookups={lookups}
              />
            ) : mainMode === 'settings' ? (
              <DirectoriesManager
                lookups={lookups}
                onRefreshLookups={fetchLookupsAndStats}
                currentSessionUser={currentSessionUser}
                onSetSessionUser={setCurrentSessionUser}
                members={allMembers}
              />
            ) : null}
          </div>
        )}

      </main>



      </div>
    </div>
  );
}
