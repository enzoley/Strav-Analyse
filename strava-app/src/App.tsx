// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import AuthCallback from './components/AuthCallback';
import Activities from './components/Activities';
import ActivityDetail from "./components/ActivityDetail.tsx";
import BannisterModel from './components/BannisterModel';
import BannisterModelTSS from './components/BannisterModelTSS';
import GpxAnalyzer from './components/GpxAnalyzer.tsx';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/redirect" element={<AuthCallback />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/activities/:id" element={<ActivityDetail />} />
                <Route path="/bannister" element={<BannisterModel />} />
                <Route path="/bannister-tss" element={<BannisterModelTSS />} />
                <Route path="/gpx-analyzer" element={<GpxAnalyzer />} />
            </Routes>
        </Router>
    );
}

export default App;