import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../App.css';
import Canvas from './Canvas/RoomCanvas';
import LeftSidebar from './Sidebar/LeftSidebar';
import BudgetPanel from './Sidebar/BudgetPanel';
import {
  getOrCreateUserId, saveDesign, listDesigns,
  loadDesign, deleteDesign, createSharedProject,
  loadProject, saveProject, renameProject
} from '../utils/saveLoad';
import { exportAsImage, exportAsPDF } from '../utils/exportUtils';
import { useHistory } from '../hooks/useHistory';
import { findOverlappingRooms, findFurnitureOutOfBounds, validateForExport } from '../utils/validation';
import EdgeCaseBanner from './EdgeCaseBanner';
import { useAuth } from '../context/AuthContext';

const userId = getOrCreateUserId();

function fmtDate(date) {
  if (!date) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function EditorView() {
  const { id: projectId } = useParams();         // route: /project/:id
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // ── Project load state ────────────────────────────────────────────────
  const [projectName,    setProjectName]    = useState('Untitled Project');
  const [projectLoading, setProjectLoading] = useState(!!projectId);
  const [autosaveStatus, setAutosaveStatus] = useState(''); // '' | 'saving' | 'saved'
  const autosaveTimer = useRef(null);

  // ── Shared canvas state ──────────────────────────────────────────────
  const history = useHistory({
    rooms: [],
    placedFurniture: [],
    doors: [],
    currentPoints: []
  });

  const rooms = history.state.rooms;
  const placedFurniture = history.state.placedFurniture;
  const doors = history.state.doors;
  const currentPoints = history.state.currentPoints;

  const setRooms = useCallback((updater) => {
    history.set((prev) => ({
      ...prev,
      rooms: typeof updater === 'function' ? updater(prev.rooms) : updater
    }));
  }, [history]);

  const setPlacedFurniture = useCallback((updater) => {
    history.set((prev) => ({
      ...prev,
      placedFurniture: typeof updater === 'function' ? updater(prev.placedFurniture) : updater
    }));
  }, [history]);

  const setDoors = useCallback((updater) => {
    history.set((prev) => ({
      ...prev,
      doors: typeof updater === 'function' ? updater(prev.doors) : updater
    }));
  }, [history]);

  const setCurrentPoints = useCallback((updater) => {
    history.set((prev) => ({
      ...prev,
      currentPoints: typeof updater === 'function' ? updater(prev.currentPoints) : updater
    }));
  }, [history]);

  const [pendingFurniture, setPendingFurniture] = useState(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
  const [doorPlacementMode, setDoorPlacementMode] = useState(false);
  const [pendingDoorType,   setPendingDoorType]   = useState(null); // e.g. 'single-left', wait until selected
  const [pendingDoorWidth,  setPendingDoorWidth]  = useState(3); // default 3 ft

  // Refs for keyboard handler (avoids stale closure)
  const roomsRef           = useRef(rooms);
  const placedRef          = useRef(placedFurniture);
  const doorsRef           = useRef(doors);
  useEffect(() => { roomsRef.current  = rooms; },           [rooms]);
  useEffect(() => { placedRef.current = placedFurniture; }, [placedFurniture]);
  useEffect(() => { doorsRef.current  = doors; },           [doors]);

  // ── Load project from Firestore on mount ─────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setProjectLoading(true);
    loadProject(projectId)
      .then(({ name, roomData }) => {
        if (cancelled) return;
        setProjectName(name);
        history.set(() => ({
          rooms:           roomData.rooms           ?? [],
          placedFurniture: roomData.placedFurniture ?? [],
          doors:           roomData.doors           ?? [],
          currentPoints:   [],
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        showToast('❌ Could not load project: ' + e.message, false);
        navigate('/dashboard');
      })
      .finally(() => { if (!cancelled) setProjectLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Debounced autosave to Firestore (2 s after last edit) ────────────
  useEffect(() => {
    if (!projectId || projectLoading) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        await saveProject(projectId, {
          rooms:           roomsRef.current,
          placedFurniture: placedRef.current,
          doors:           doorsRef.current,
        });
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus(''), 2000);
      } catch {
        setAutosaveStatus('');
      }
    }, 2000);
    return () => clearTimeout(autosaveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, placedFurniture, doors]);

  // ── Modal / UI state ─────────────────────────────────────────────────
  const [modal,       setModal]       = useState(null); // 'save' | 'load' | null
  const [saveName,    setSaveName]    = useState('');
  const [saving,      setSaving]      = useState(false);
  const [designs,     setDesigns]     = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [toast,       setToast]       = useState(null);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [shareUrl,    setShareUrl]    = useState('');
  
  const canvasRef = useRef(null);

  // ── Toast ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Budget helpers ────────────────────────────────────────────────────
  const handlePriceChange = (id, newPrice) =>
    setPlacedFurniture(prev =>
      prev.map(f => f.id === id ? { ...f, customPrice: Number(newPrice) } : f)
    );
  const handleRemoveItem = (id) =>
    setPlacedFurniture(prev => prev.filter(f => f.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDesign(userId, saveName || 'Untitled Design', rooms, placedFurniture, doors);
      setModal(null); setSaveName('');
      showToast('✅ Design saved!');
    } catch (e) { showToast('❌ Save failed: ' + e.message, false); }
    finally { setSaving(false); }
  };

  // ── Share (generate link) ───────────────────────────────────────────────
  const handleShareProject = () => {
    setShareOpen(false);
    setShareUrl('');
    setModal('share');
  };

  const generateShareLink = async () => {
    const v = validateForExport(rooms, placedFurniture);
    if (!v.valid) { setToast(v.error); return; }
    
    setSaving(true);
    try {
      const docId = await createSharedProject(rooms, placedFurniture, doors);
      setShareUrl(window.location.origin + '/view/' + docId);
      showToast('✅ Share link generated!');
    } catch (e) { showToast('❌ Share failed: ' + e.message, false); }
    finally { setSaving(false); }
  };

  // ── Quick-save / manual save button (Ctrl+S) ─────────────────────────
  const quickSave = useCallback(async () => {
    try {
      let thumbnailUrl = null;
      if (canvasRef.current) {
        try {
          thumbnailUrl = await canvasRef.current.captureFullView();
        } catch (e) {
          console.warn("Could not capture thumbnail", e);
        }
      }

      if (projectId) {
        // Authenticated project → save to Firestore immediately
        setAutosaveStatus('saving');
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        await saveProject(projectId, {
          rooms:           roomsRef.current,
          placedFurniture: placedRef.current,
          doors:           doorsRef.current,
        }, thumbnailUrl);
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus(''), 2000);
        showToast('✅ Project saved!');
      } else {
        // Fallback: save to localStorage
        localStorage.setItem('floorplan_rooms', JSON.stringify(roomsRef.current));
        localStorage.setItem('floorplan_furniture', JSON.stringify(placedRef.current));
        localStorage.setItem('floorplan_doors', JSON.stringify(doorsRef.current));
        showToast('✅ Progress saved locally!');
      }
    } catch (e) { showToast('❌ Save failed: ' + e.message, false); }
  }, [showToast, projectId]);

  // ── Open load modal ───────────────────────────────────────────────────
  const openLoadModal = useCallback(async () => {
    setModal('load'); setLoadingList(true);
    try {
      setDesigns(await listDesigns(userId));
    } catch (e) { showToast('❌ Could not load designs: ' + e.message, false); }
    finally { setLoadingList(false); }
  }, [showToast]);

  // ── Load design ───────────────────────────────────────────────────────
  const handleLoad = async (designId) => {
    try {
      const { rooms: r, placedFurniture: pf, doors: d } = await loadDesign(userId, designId);
      setRooms(r); setPlacedFurniture(pf); setDoors(d || []); setPendingFurniture(null); setDoorPlacementMode(false);
      setModal(null); showToast('✅ Design loaded!');
    } catch (e) { showToast('❌ Load failed: ' + e.message, false); }
  };

  // ── Delete design ─────────────────────────────────────────────────────
  const handleDelete = async (designId) => {
    try {
      await deleteDesign(userId, designId);
      setDesigns(prev => prev.filter(d => d.id !== designId));
      showToast('🗑 Design deleted');
    } catch (e) { showToast('❌ Delete failed: ' + e.message, false); }
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          history.redo();
        } else {
          history.undo();
        }
      } else if (key === 's') {
        e.preventDefault();
        e.shiftKey ? (setSaveName(''), setModal('save')) : quickSave();
      } else if (key === 'o') {
        e.preventDefault();
        openLoadModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quickSave, openLoadModal]);

  const closeModal = (e) => { if (e.target === e.currentTarget) setModal(null); };

  return (
    <div className="app-shell">
      <header className="app-top-bar">
        <div className="app-top-brand">
          <span
            className="app-logo"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            FloorPlan Pro
          </span>
          {projectId && (
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 400, marginRight: '4px' }}>/</span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={async (e) => {
                  e.target.style.borderBottom = '1px solid transparent';
                  const finalName = projectName.trim() || 'Untitled Project';
                  if (!projectName.trim()) setProjectName(finalName);
                  try {
                    await renameProject(projectId, finalName);
                  } catch(err) {
                    showToast('❌ Failed to rename project', false);
                  }
                }}
                onFocus={(e) => {
                  e.target.style.borderBottom = '1px solid var(--accent-green)';
                  e.target.select();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                style={{
                  background: 'transparent', border: 'none', borderBottom: '1px solid transparent',
                  fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'inherit',
                  padding: '2px 4px', outline: 'none', minWidth: '150px', transition: 'border-color 0.2s',
                  cursor: 'text'
                }}
                title="Rename project"
              />
            </div>
          )}
        </div>
        <div className="app-top-actions">
          <button 
            type="button" 
            className="top-pill" 
            onClick={quickSave}
            title="Save Project"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-green)', color: 'white', border: 'none', padding: '8px 16px', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }}
          >
            Save
          </button>
          <div style={{ position: 'relative', zIndex: 1000 }}>
            <button 
              type="button" 
              className="top-pill" 
              onClick={() => setShareOpen(!shareOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-hover)', color: 'var(--accent-green)', border: '1px solid var(--border-input)', padding: '8px 12px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
            {shareOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-panel)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '8px', width: '240px', zIndex: 100, fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div onClick={async () => { 
                  setShareOpen(false); 
                  const v = validateForExport(rooms, placedFurniture);
                  if (!v.valid) { setToast(v.error); return; }
                  if (!canvasRef.current) return;
                  const dataUrl = await canvasRef.current.captureFullView();
                  const name = rooms.length > 0 ? (rooms.length === 1 ? 'Room 1' : `${rooms.length} Rooms Design`) : 'Empty Design';
                  exportAsImage(saveName || name, dataUrl); 
                }} className="dropdown-menu-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  Export as Image
                </div>
                <div onClick={async () => { 
                  setShareOpen(false); 
                  const v = validateForExport(rooms, placedFurniture);
                  if (!v.valid) { setToast(v.error); return; }
                  if (!canvasRef.current) return;
                  const dataUrl = await canvasRef.current.captureFullView();
                  const name = rooms.length > 0 ? (rooms.length === 1 ? 'Room 1' : `${rooms.length} Rooms Design`) : 'Empty Design';
                  exportAsPDF(saveName || name, placedFurniture, doors, dataUrl); 
                }} className="dropdown-menu-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Export as PDF
                </div>
                <div onClick={handleShareProject} className="dropdown-menu-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                  Share Project
                </div>
              </div>
            )}
          </div>

          {/* Autosave status */}
          {autosaveStatus && (
            <span style={{ fontSize: '12px', color: autosaveStatus === 'saving' ? '#9ca3af' : '#16a34a', fontWeight: 500 }}>
              {autosaveStatus === 'saving' ? '⟳ Saving…' : '✓ Saved'}
            </span>
          )}

          {/* User avatar + dropdown — Step 6 */}
          {(() => {
            const name = currentUser?.displayName || currentUser?.email || '';
            const parts = name.trim().split(/\s+/);
            const initials = parts.length >= 2
              ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
              : name.slice(0, 2).toUpperCase() || 'U';
            return (
              <div style={{ position: 'relative' }}>
                <div
                  className="top-avatar"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setModal(modal === 'profile' ? null : 'profile')}
                  title={currentUser?.displayName || currentUser?.email}
                >
                  {initials}
                </div>
                {modal === 'profile' && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setModal(null)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden transform opacity-100 scale-100 transition-all duration-200" style={{ top: '44px' }}>
                      <div className="px-5 py-4 bg-gray-50/50">
                        <div className="font-semibold text-[15px] text-gray-900 truncate">{currentUser?.displayName || 'User'}</div>
                        <div className="text-[13px] text-gray-500 mt-0.5 truncate">{currentUser?.email}</div>
                      </div>
                      <div className="h-px bg-gray-100 w-full" />
                      <div className="py-2">
                        <button className="flex items-center justify-between w-full px-5 py-2.5 text-[14.5px] text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors text-left" onClick={() => setModal(null)}>
                          My Profile
                        </button>
                        <button className="flex items-center justify-between w-full px-5 py-2.5 text-[14.5px] text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors text-left" onClick={() => setModal(null)}>
                          Subscription 
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Free</span>
                        </button>
                        <button className="flex items-center justify-between w-full px-5 py-2.5 text-[14.5px] text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors text-left" onClick={() => setModal(null)}>
                          Account Settings
                        </button>
                      </div>
                      <div className="h-px bg-gray-100 w-full" />
                      <div className="py-2">
                        <button className="flex items-center justify-between w-full px-5 py-2.5 text-[14.5px] text-red-500 hover:bg-red-50 transition-colors text-left font-medium" 
                          onClick={() => { 
                            setModal(null); 
                            navigate('/'); 
                            setTimeout(() => { logout(); }, 0); 
                          }}>
                          Log out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </header>

      {/* Project loading overlay */}
      {projectLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>📐</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>Loading project…</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '6px' }}>{projectName}</div>
        </div>
      )}

      <div className="app-content">
        <div className="app-sidebar-left">
          <LeftSidebar
            onSelectFurniture={(f) => { setPendingFurniture(f); if (f) { setDoorPlacementMode(false); setPendingDoorType(null); } }}
            rooms={rooms}
            setRooms={setRooms}
            selectedRoomIndex={selectedRoomIndex}
            doorPlacementMode={doorPlacementMode}
            setDoorPlacementMode={(v) => { setDoorPlacementMode(v); if (v) setPendingFurniture(null); }}
            doors={doors}
            setDoors={setDoors}
            pendingDoorType={pendingDoorType}
            setPendingDoorType={setPendingDoorType}
            pendingDoorWidth={pendingDoorWidth}
            setPendingDoorWidth={setPendingDoorWidth}
          />
        </div>

        <div className="app-canvas-area" style={{ position: 'relative' }}>
          <EdgeCaseBanner 
            overlappingRooms={findOverlappingRooms(rooms)} 
            furnitureOutOfBounds={findFurnitureOutOfBounds(rooms, placedFurniture)} 
          />
          <Canvas
            exportRef={canvasRef}
            pendingFurniture={pendingFurniture}
            onFurniturePlaced={() => setPendingFurniture(null)}
            placedFurniture={placedFurniture}
            setPlacedFurniture={setPlacedFurniture}
            rooms={rooms}
            setRooms={setRooms}
            selectedRoomIndex={selectedRoomIndex}
            setSelectedRoomIndex={setSelectedRoomIndex}
            onSaveClick={quickSave}
            onSaveAsClick={() => { setSaveName(''); setModal('save'); }}
            onLoadClick={openLoadModal}
            doors={doors}
            setDoors={setDoors}
            doorPlacementMode={doorPlacementMode}
            setDoorPlacementMode={setDoorPlacementMode}
            pendingDoorType={pendingDoorType}
            pendingDoorWidth={pendingDoorWidth}
            setPendingDoorType={setPendingDoorType}
            history={history}
            onError={showToast}
            currentPoints={currentPoints}
            setCurrentPoints={setCurrentPoints}
          />
        </div>
        <div className="app-sidebar-right">
        <BudgetPanel
          rooms={rooms}
          placedFurniture={placedFurniture}
          doors={doors}
          onPriceChange={handlePriceChange}
          onRemove={handleRemoveItem}
          onRemoveDoor={(id) => setDoors(doors.filter(d => d.id !== id))}
        />
      </div>
    </div>

      {/* ════ SAVE MODAL ════ */}
      {modal === 'save' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="app-modal-card">
            <div className="app-modal-header save">
              <div>
                <div className="app-modal-title">💾 Save Design</div>
                <div className="app-modal-subtitle">
                  {rooms.length} room{rooms.length!==1?'s':''} · {placedFurniture.length} item{placedFurniture.length!==1?'s':''}
                </div>
              </div>
            </div>
            <div className="app-modal-content">
              <label className="app-modal-label">Design name</label>
              <input
                autoFocus value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !saving && handleSave()}
                placeholder="e.g. Master Bedroom Layout"
                className="app-modal-input"
              />
              <div className="app-modal-row">
                <button type="button" className="app-modal-button secondary" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button type="button" className={`app-modal-button primary${saving ? ' disabled' : ''}`} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ SHARE MODAL ════ */}
      {modal === 'share' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="app-modal-card" style={{ width: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="app-modal-header" style={{ color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 0 }}>
              <h2 className="app-modal-title" style={{ fontSize: '1.25rem', fontWeight: 600 }}>Floor Plan Pro</h2>
              <button className="app-modal-close-button" style={{ color: 'var(--text-muted)', background: 'transparent', fontSize: '20px' }} onClick={closeModal}>×</button>
            </div>
            <div className="app-modal-content">
              <p className="app-modal-subtitle" style={{ marginBottom: '16px' }}>
                Generate a link to share a read-only version of your project.
              </p>
              
              {shareUrl ? (
                <>
                  <div className="app-modal-row">
                    <input
                      type="text"
                      className="app-modal-input"
                      value={shareUrl}
                      readOnly
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <button className="app-modal-button secondary" onClick={closeModal}>Close</button>
                    <button className="app-modal-button primary" onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      showToast('📋 Link copied to clipboard!');
                    }}>Copy Link</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button className="app-modal-button secondary" onClick={closeModal}>Cancel</button>
                  <button className="app-modal-button primary" onClick={generateShareLink} disabled={saving}>
                    {saving ? 'Generating...' : 'Generate Link'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ LOAD MODAL ════ */}
      {modal === 'load' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="app-modal-card wide">
            <div className="app-modal-header load">
              <div>
                <div className="app-modal-title">📂 Saved Designs</div>
                <div className="app-modal-subtitle light">Click a design to restore it</div>
              </div>
              <button type="button" className="app-modal-close-button" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="saved-designs-list">
              {loadingList ? (
                <div className="catalog-no-results">Loading designs…</div>
              ) : designs.length === 0 ? (
                <div className="empty-designs-state">
                  <div className="empty-designs-graphic">🗂</div>
                  <div className="empty-designs-copy">No saved designs yet</div>
                  <div className="empty-designs-subcopy">Press Ctrl+S to quick-save your current design</div>
                </div>
              ) : designs.map(d => (
                <div key={d.id} className="saved-design-card" onClick={() => handleLoad(d.id)}>
                  <div className="saved-design-avatar">🏠</div>
                  <div className="saved-design-info">
                    <div className="saved-design-name">{d.name}</div>
                    <div className="saved-design-meta">{d.roomCount} room{d.roomCount!==1?'s':''} · {d.furnitureCount} item{d.furnitureCount!==1?'s':''} · {fmtDate(d.savedAt)}</div>
                  </div>
                  <button type="button" className="saved-design-load" onClick={() => handleLoad(d.id)}>Load</button>
                  <button type="button" className="saved-design-trash" onClick={e => { e.stopPropagation(); handleDelete(d.id); }} title="Delete">🗑</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ TOAST ════ */}
      {toast && (
        <div className={`toast-message ${toast.ok ? 'success' : 'error'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}