import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listProjects, createProject, deleteProject, renameProject } from '../utils/saveLoad';
import LogoIcon from '../components/LogoIcon';

// Helper: user initials from displayName
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Helper: format date
function fmtDate(date) {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [toast, setToast] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listProjects(currentUser.uid);
      setProjects(list);
    } catch (e) {
      setError('Could not load projects. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const id = await createProject(currentUser.uid, 'Untitled Project');
      navigate(`/project/${id}`);
    } catch (e) {
      showToast('Failed to create project', false);
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      showToast('Project deleted');
    } catch {
      showToast('Delete failed', false);
    }
  };

  const handleRenameSubmit = async (id) => {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    try {
      await renameProject(id, renameVal.trim());
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: renameVal.trim() } : p));
      showToast('Renamed');
    } catch { showToast('Rename failed', false); }
    setRenamingId(null);
  };

  const handleLogout = async () => {
    navigate('/');
    // Use a small timeout to let React Router process the navigation before the auth state changes
    setTimeout(() => {
      logout();
    }, 0);
  };

  const initials = getInitials(currentUser.displayName);

  return (
    <div style={s.page}>
      {/* Header */}
      <header className="sticky border-b top-0 z-40 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="w-full h-20 px-4 lg:px-8 flex justify-between items-center relative">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ textDecoration: 'none' }}>
            <LogoIcon className="w-5 h-5 text-green-600" />
            <span className="font-bold text-xl text-gray-900">
              FloorPlan <span className="text-green-600">Pro</span>
            </span>
          </Link>

          {/* Avatar + dropdown */}
          <div style={{ position: 'relative' }}>
            <button style={s.avatar} onClick={() => setDropdownOpen(o => !o)} title={currentUser.displayName || currentUser.email}>
              {initials}
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden transform opacity-100 scale-100 transition-all duration-200">
                  <div className="px-5 py-4 bg-gray-50/50">
                    <div className="font-semibold text-[15px] text-gray-900 truncate">{currentUser.displayName || 'User'}</div>
                    <div className="text-[13px] text-gray-500 mt-0.5 truncate">{currentUser.email}</div>
                  </div>
                  <div className="h-px bg-gray-100 w-full" />
                  <div className="py-2">
                    <button className="flex items-center justify-between w-full px-5 py-2.5 text-[14.5px] text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors text-left" onClick={() => { setDropdownOpen(false); }}>
                      My Profile
                    </button>
                    <button className="flex items-center justify-between w-full px-5 py-2.5 text-[14.5px] text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors text-left" onClick={() => { setDropdownOpen(false); }}>
                      Subscription 
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Free</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-5 py-2.5 text-[14.5px] text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors text-left" onClick={() => { setDropdownOpen(false); }}>
                      Account Settings
                    </button>
                  </div>
                  <div className="h-px bg-gray-100 w-full" />
                  <div className="py-2">
                    <button className="flex items-center justify-between w-full px-5 py-2.5 text-[14.5px] text-red-500 hover:bg-red-50 transition-colors text-left font-medium" onClick={handleLogout}>
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={s.main}>
        <div style={s.topRow}>
          <div>
            <h1 style={s.pageTitle}>My Projects</h1>
            <p style={s.pageSubtitle}>
              {loading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button style={{ ...s.createBtn, opacity: creating ? 0.7 : 1 }} onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : '+ New Project'}
          </button>
        </div>

        {error && <div style={s.errorBox}>{error} <button style={s.retryBtn} onClick={fetchProjects}>Retry</button></div>}

        {loading ? (
          <div style={s.emptyState}>
            <div style={s.spinner} />
            <p style={{ color: '#9ca3af', marginTop: '16px' }}>Loading your projects…</p>
          </div>
        ) : projects.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📐</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No projects yet</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Create your first floor plan to get started.</p>
            <button style={s.createBtn} onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : '+ Create your first project'}
            </button>
          </div>
        ) : (
          <div style={s.grid}>
            {projects.map(p => (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow border border-gray-100 flex flex-col group relative">
                <div 
                  className="h-48 bg-gray-50 flex items-center justify-center cursor-pointer relative overflow-hidden" 
                  onClick={() => navigate(`/project/${p.id}`)}
                >
                  <img src={p.thumbnailUrl || '/assets/premium-floorplan.png'} alt="Project thumbnail" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                </div>

                <div className="p-4 flex items-center justify-between bg-white relative z-10">
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {renamingId === p.id ? (
                      <input
                        autoFocus
                        style={s.renameInput}
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={() => handleRenameSubmit(p.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSubmit(p.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                      />
                    ) : (
                      <h3 
                        className="font-bold text-[17px] text-gray-900 truncate cursor-pointer hover:text-green-600"
                        onClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
                        title="Click to rename"
                      >
                        {p.name}
                      </h3>
                    )}
                    <span className="text-[14px] text-gray-500 mt-1">{fmtDate(p.lastEdited)}</span>
                  </div>

                  <div className="relative ml-2">
                    <button 
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      onClick={() => setProjectToDelete(p)}
                      title="Delete Project"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100 opacity-100">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Project?</h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-gray-900">"{projectToDelete.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button 
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-[14.5px] font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleDelete(projectToDelete.id, projectToDelete.name);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl text-[14.5px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.ok ? '#16a34a' : '#dc2626' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
  header: {
    background: '#fff', borderBottom: '1px solid #e5e7eb',
    padding: '0 24px', height: '80px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'sticky', top: 0, zIndex: 20,
  },
  logoLink: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontWeight: 700, fontSize: '18px', color: '#111827', textDecoration: 'none',
  },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%',
    background: '#1bc650', color: '#fff',
    border: 'none', cursor: 'pointer',
    fontSize: '14px', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  backdrop: { position: 'fixed', inset: 0, zIndex: 30 },
  dropdown: {
    position: 'absolute', right: 0, top: '44px',
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: '220px', zIndex: 40, overflow: 'hidden',
  },
  dropUser: { padding: '14px 16px' },
  dropName: { fontWeight: 600, fontSize: '14px', color: '#111827' },
  dropEmail: { fontSize: '12px', color: '#6b7280', marginTop: '2px' },
  dropDivider: { height: '1px', background: '#f3f4f6' },
  dropItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '10px 16px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '14px', color: '#374151', textAlign: 'left',
    transition: 'background 0.1s',
  },
  freeBadge: {
    background: '#dcfce7', color: '#16a34a',
    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
  },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' },
  topRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' },
  pageTitle: { fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 },
  pageSubtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
  createBtn: {
    padding: '10px 20px', background: '#16a34a', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
    borderRadius: '8px', padding: '12px 16px', marginBottom: '24px',
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  retryBtn: {
    background: 'none', border: '1px solid #dc2626', color: '#dc2626',
    borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '13px',
  },
  emptyState: {
    textAlign: 'center', padding: '80px 24px',
    background: '#fff', borderRadius: '16px', border: '2px dashed #e5e7eb',
  },
  spinner: {
    width: '36px', height: '36px', border: '3px solid #e5e7eb',
    borderTop: '3px solid #16a34a', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
    transition: 'box-shadow 0.15s',
  },
  cardThumb: {
    height: '140px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', borderBottom: '1px solid #e5e7eb',
  },
  thumbIcon: { fontSize: '36px' },
  thumbMeta: { fontSize: '12px', color: '#6b7280', marginTop: '8px' },
  cardBody: { padding: '14px 16px', flex: 1 },
  cardName: {
    fontWeight: 600, fontSize: '15px', color: '#111827',
    cursor: 'text', marginBottom: '4px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  renameInput: {
    width: '100%', fontWeight: 600, fontSize: '15px', color: '#111827',
    border: '1px solid #16a34a', borderRadius: '6px', padding: '3px 8px',
    outline: 'none', fontFamily: 'inherit', marginBottom: '4px',
  },
  cardMeta: { fontSize: '12px', color: '#9ca3af' },
  cardActions: {
    padding: '10px 16px', display: 'flex', gap: '8px',
    borderTop: '1px solid #f3f4f6', alignItems: 'center',
  },
  openBtn: {
    flex: 1, padding: '7px', background: '#16a34a', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  deleteBtn: {
    padding: '7px 10px', background: 'none', border: '1px solid #e5e7eb',
    borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
  },
  toast: {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    color: '#fff', padding: '10px 20px', borderRadius: '8px',
    fontSize: '14px', fontWeight: 500, zIndex: 999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
};
