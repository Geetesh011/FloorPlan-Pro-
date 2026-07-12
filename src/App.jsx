import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EditorView from './components/EditorView';
import SharedProjectView from './components/SharedProjectView';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EditorView />} />
        <Route path="/view/:projectId" element={<SharedProjectView />} />
      </Routes>
    </Router>
  );
}