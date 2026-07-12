import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Canvas from './Canvas/RoomCanvas';
import BudgetPanel from './Sidebar/BudgetPanel';
import { getSharedProject } from '../utils/saveLoad';
import '../App.css';

export default function SharedProjectView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProject() {
      try {
        const data = await getSharedProject(projectId);
        if (!data) {
          setError('Project not found or has been removed.');
        } else {
          setProject(data);
        }
      } catch (err) {
        console.error('Error loading shared project:', err);
        setError('Failed to load the shared project.');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="app-modal-loading">
          <div className="spinner" />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ color: '#334155', fontFamily: 'Inter' }}>{error || 'Project Not Found'}</h2>
        <Link to="/" style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
          Create your own design
        </Link>
      </div>
    );
  }

  // Use empty arrays as fallback if data is missing
  const { rooms = [], placedFurniture = [], doors = [] } = project;

  return (
    <div className="app-shell">
      <header className="app-top-bar">
        <div className="app-top-brand">
          <span className="app-logo">FloorPlan Pro</span>
          <span style={{ marginLeft: '12px', padding: '4px 8px', background: '#e0e7ff', color: '#4338ca', fontSize: '11px', fontWeight: '700', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Read-Only View</span>
        </div>
        <div className="app-top-actions">
          <Link to="/" style={{ padding: '8px 16px', background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '999px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' }}>
            Try FloorPlan Pro
          </Link>
        </div>
      </header>

      <div className="app-content">
        <div className="app-canvas-area" style={{ borderLeft: 'none' }}>
          <Canvas
            rooms={rooms}
            placedFurniture={placedFurniture}
            doors={doors}
            readOnly={true}
          />
        </div>
        <div className="app-sidebar-right">
          <BudgetPanel
            rooms={rooms}
            placedFurniture={placedFurniture}
            doors={doors}
            readOnly={true}
          />
        </div>
      </div>
    </div>
  );
}
