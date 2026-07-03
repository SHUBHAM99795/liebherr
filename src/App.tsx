import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AnfragenList from './pages/AnfragenList';
import AnfrageDetail from './pages/AnfrageDetail';
import SegmentsTable from './pages/SegmentsTable';
import SegmentDetail from './pages/SegmentDetail';
import Papierkorb from './pages/Papierkorb';
import InterneStandards from './pages/InterneStandards';
import Einstellungen from './pages/Einstellungen';
import Checklisten from './pages/Checklisten';
import ChecklistItems from './pages/ChecklistItems';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/anfragen" replace />} />
        <Route path="/anfragen" element={<AnfragenList />} />
        <Route path="/anfrage/:id" element={<AnfrageDetail />} />
        <Route path="/anfrage/:id/details" element={<SegmentsTable />} />
        <Route path="/anfrage/:id/details/segment/:segmentId" element={<SegmentDetail />} />
        <Route path="/papierkorb" element={<Papierkorb />} />
        <Route path="/interne-standards" element={<InterneStandards />} />
        <Route path="/einstellungen" element={<Einstellungen />} />
        <Route path="/check-lists" element={<Checklisten />} />
        <Route path="/check-lists/:id/items" element={<ChecklistItems />} />
      </Route>
    </Routes>
  );
}
