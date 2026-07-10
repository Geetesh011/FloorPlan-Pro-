import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Canvas from './components/Canvas/RoomCanvas';
import FurnitureCatalog from './components/Sidebar/FurnitureCatalog';
import BudgetPanel from './components/Sidebar/BudgetPanel';
import {
  getOrCreateUserId, saveDesign, listDesigns,
  loadDesign, deleteDesign,
} from './utils/saveLoad';

const userId = getOrCreateUserId();

function fmtDate(date) {
  if (!date) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function App() {
  // ── Shared canvas state ──────────────────────────────────────────────
  const [rooms,            setRooms]            = useState([]);
  const [pendingFurniture, setPendingFurniture] = useState(null);
  const [placedFurniture,  setPlacedFurniture]  = useState([]);

  // Refs for keyboard handler (avoids stale closure)
  const roomsRef           = useRef(rooms);
  const placedRef          = useRef(placedFurniture);
  useEffect(() => { roomsRef.current  = rooms; },           [rooms]);
  useEffect(() => { placedRef.current = placedFurniture; }, [placedFurniture]);

  // ── Modal / UI state ─────────────────────────────────────────────────
  const [modal,       setModal]       = useState(null); // 'save' | 'load' | null
  const [saveName,    setSaveName]    = useState('');
  const [saving,      setSaving]      = useState(false);
  const [designs,     setDesigns]     = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [toast,       setToast]       = useState(null);

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

  // ── Save (modal confirm) ──────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDesign(userId, saveName || 'Untitled Design', rooms, placedFurniture);
      setModal(null); setSaveName('');
      showToast('✅ Design saved!');
    } catch (e) { showToast('❌ Save failed: ' + e.message, false); }
    finally { setSaving(false); }
  };

  // ── Quick-save (Ctrl+S) ───────────────────────────────────────────────
  const quickSave = useCallback(async () => {
    const name = `Design — ${new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })}`;
    try {
      await saveDesign(userId, name, roomsRef.current, placedRef.current);
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
      const { rooms: r, placedFurniture: pf } = await loadDesign(userId, designId);
      setRooms(r); setPlacedFurniture(pf); setPendingFurniture(null);
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
          <span className="app-logo">Planner 5D</span>
          <span className="app-breadcrumb">My Projects <span className="breadcrumb-sep">›</span> Living Room</span>
        </div>
        <div className="app-top-actions">
          <button type="button" className="top-pill">3D</button>
          <button type="button" className="top-pill">VR</button>
          <button type="button" className="top-pill primary">Save</button>
          <div className="top-avatar">V</div>
        </div>
      </header>

      <div className="app-content">
        <div className="app-sidebar-left">
          <FurnitureCatalog onSelectFurniture={setPendingFurniture} />
        </div>

        <div className="app-canvas-area">
          <Canvas
            pendingFurniture={pendingFurniture}
            onFurniturePlaced={() => setPendingFurniture(null)}
            placedFurniture={placedFurniture}
            setPlacedFurniture={setPlacedFurniture}
            rooms={rooms}
            setRooms={setRooms}
            onSaveClick={quickSave}
            onSaveAsClick={() => { setSaveName(''); setModal('save'); }}
            onLoadClick={openLoadModal}
          />
        </div>
        <div className="app-sidebar-right">
        <BudgetPanel
          rooms={rooms}
          placedFurniture={placedFurniture}
          onPriceChange={handlePriceChange}
          onRemove={handleRemoveItem}
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

export default App;