import { useState, useEffect, useCallback, useRef } from 'react';
import '../App.css';
import Canvas from './Canvas/RoomCanvas';
import LeftSidebar from './Sidebar/LeftSidebar';
import BudgetPanel from './Sidebar/BudgetPanel';
import {
  getOrCreateUserId, saveDesign, listDesigns,
  loadDesign, deleteDesign, createSharedProject
} from '../utils/saveLoad';

const userId = getOrCreateUserId();

function fmtDate(date) {
  if (!date) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function EditorView() {
  // ── Shared canvas state ──────────────────────────────────────────────
  const [rooms,            setRooms]            = useState([]);
  const [pendingFurniture, setPendingFurniture] = useState(null);
  const [placedFurniture,  setPlacedFurniture]  = useState([]);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
  const [doors,            setDoors]            = useState([]);
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

  // ── Modal / UI state ─────────────────────────────────────────────────
  const [modal,       setModal]       = useState(null); // 'save' | 'load' | null
  const [saveName,    setSaveName]    = useState('');
  const [saving,      setSaving]      = useState(false);
  const [designs,     setDesigns]     = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [toast,       setToast]       = useState(null);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [shareUrl,    setShareUrl]    = useState('');

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
  const handleShareProject = async () => {
    console.log('[handleShareProject] Triggered!');
    setSaving(true);
    setShareOpen(false);
    try {
      console.log('[handleShareProject] About to call createSharedProject (Firestore write)...');
      const docId = await createSharedProject(rooms, placedFurniture, doors);
      setShareUrl(window.location.origin + '/view/' + docId);
      setModal('share');
      showToast('✅ Share link generated!');
    } catch (e) { showToast('❌ Share failed: ' + e.message, false); }
    finally { setSaving(false); }
  };

  // ── Quick-save (Ctrl+S) ───────────────────────────────────────────────
  const quickSave = useCallback(async () => {
    const name = `Design — ${new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })}`;
    try {
      await saveDesign(userId, name, roomsRef.current, placedRef.current, doorsRef.current);
      showToast(`✅ Saved as "${name}"`);
    } catch (e) { showToast('❌ Save failed: ' + e.message, false); }
  }, [showToast]);

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
  // Defined AFTER openLoadModal & quickSave to avoid TDZ
  useEffect(() => {
    const onKey = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
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
          <span className="app-logo">FloorPlan Pro</span>
        </div>
        <div className="app-top-actions">
          <button 
            type="button" 
            className="top-pill" 
            onClick={quickSave}
            title="Save Project"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#6366f1', border: '1px solid #e2e8f0', padding: '8px 12px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          </button>
          <div style={{ position: 'relative' }}>
            <button 
              type="button" 
              className="top-pill" 
              onClick={() => setShareOpen(!shareOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', color: '#22c55e', border: '1px solid #e2e8f0', padding: '8px 12px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
            {shareOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '8px', width: '240px', zIndex: 100, fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontWeight: 500 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Print
                </div>
                <div onClick={handleShareProject} style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontWeight: 500 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                  Share Project
                </div>
              </div>
            )}
          </div>
          <div className="top-avatar">V</div>
        </div>
      </header>

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

        <div className="app-canvas-area">
          <Canvas
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
          <div className="app-modal-card">
            <div className="app-modal-header save">
              <div>
                <h2>Project Shared!</h2>
                <p>Anyone with this link can view a read-only version of your project.</p>
              </div>
              <button className="app-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="app-modal-body">
              <input
                type="text"
                className="app-modal-input"
                value={shareUrl}
                readOnly
                onClick={(e) => e.target.select()}
                style={{ backgroundColor: '#f1f5f9', color: '#475569' }}
              />
            </div>
            <div className="app-modal-footer">
              <button className="app-modal-btn default" onClick={() => setModal(null)}>Close</button>
              <button className="app-modal-btn primary" onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                showToast('✅ Link copied to clipboard!');
              }}>
                Copy Link
              </button>
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