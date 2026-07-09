import { useState, useEffect, useCallback, useRef } from 'react';
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

  const modalCard = {
    background: '#fff', borderRadius: 16,
    boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
    width: 420, maxWidth: '92vw', overflow: 'hidden',
  };

  return (
    <div style={{ display:'flex', width:'100vw', height:'100vh', background:'#f0f2f5', overflow:'hidden', position:'relative' }}>

      <FurnitureCatalog onSelectFurniture={setPendingFurniture} />

      <div style={{ flex:1, display:'flex', minWidth:0, overflow:'hidden' }}>
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

      <BudgetPanel
        placedFurniture={placedFurniture}
        onPriceChange={handlePriceChange}
        onRemove={handleRemoveItem}
      />

      {/* ════ SAVE MODAL ════ */}
      {modal === 'save' && (
        <div onClick={closeModal} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={modalCard}>
            <div style={{ background:'linear-gradient(135deg,#6b5b95,#9333ea)', padding:'18px 22px', color:'#fff' }}>
              <div style={{ fontWeight:800, fontSize:15 }}>💾 Save Design</div>
              <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>
                {rooms.length} room{rooms.length!==1?'s':''} · {placedFurniture.length} item{placedFurniture.length!==1?'s':''}
              </div>
            </div>
            <div style={{ padding:'22px 22px 20px' }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#334155', display:'block', marginBottom:8 }}>Design name</label>
              <input
                autoFocus value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !saving && handleSave()}
                placeholder="e.g. Master Bedroom Layout"
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 13px', borderRadius:9, border:'1.5px solid #e2e5ea', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1e293b' }}
                onFocus={e => e.target.style.borderColor='#6b5b95'}
                onBlur={e => e.target.style.borderColor='#e2e5ea'}
              />
              <div style={{ display:'flex', gap:10, marginTop:18, justifyContent:'flex-end' }}>
                <button onClick={() => setModal(null)} style={{ padding:'9px 20px', borderRadius:8, border:'1.5px solid #e2e5ea', background:'#f7f8fa', fontSize:13, fontWeight:600, color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding:'9px 24px', borderRadius:8, background:saving?'#a78bfa':'linear-gradient(135deg,#6b5b95,#9333ea)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
                  {saving ? 'Saving…' : '💾 Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ LOAD MODAL ════ */}
      {modal === 'load' && (
        <div onClick={closeModal} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ ...modalCard, width:500 }}>
            <div style={{ background:'linear-gradient(135deg,#1e293b,#334155)', padding:'18px 22px', color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:15 }}>📂 Saved Designs</div>
                <div style={{ fontSize:11, opacity:0.7, marginTop:2 }}>Click a design to restore it</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:6, color:'#fff', fontSize:16, cursor:'pointer', width:30, height:30 }}>✕</button>
            </div>
            <div style={{ maxHeight:380, overflowY:'auto', padding:'10px 12px 16px' }}>
              {loadingList ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', fontSize:13 }}>Loading designs…</div>
              ) : designs.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>🗂</div>
                  <div style={{ color:'#94a3b8', fontSize:13 }}>No saved designs yet</div>
                  <div style={{ color:'#cbd5e1', fontSize:11, marginTop:4 }}>Press Ctrl+S to quick-save your current design</div>
                </div>
              ) : designs.map(d => (
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, border:'1.5px solid #e2e5ea', marginBottom:8, background:'#f7f8fa', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#6b5b95'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#e2e5ea'}
                >
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#6b5b95,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏠</div>
                  <div style={{ flex:1, minWidth:0 }} onClick={() => handleLoad(d.id)}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#1e293b', marginBottom:2 }}>{d.name}</div>
                    <div style={{ fontSize:10, color:'#94a3b8' }}>{d.roomCount} room{d.roomCount!==1?'s':''} · {d.furnitureCount} item{d.furnitureCount!==1?'s':''} · {fmtDate(d.savedAt)}</div>
                  </div>
                  <button onClick={() => handleLoad(d.id)} style={{ padding:'6px 14px', borderRadius:7, background:'linear-gradient(135deg,#6b5b95,#9333ea)', border:'none', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>Load</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(d.id); }} title="Delete" style={{ width:28, height:28, borderRadius:7, flexShrink:0, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ TOAST ════ */}
      {toast && (
        <div style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', background:toast.ok?'#1e293b':'#7f1d1d', color:'#fff', borderRadius:20, padding:'9px 22px', fontSize:13, fontWeight:600, boxShadow:'0 8px 24px rgba(0,0,0,0.25)', zIndex:1000, whiteSpace:'nowrap' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default App;