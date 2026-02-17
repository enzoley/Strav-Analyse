// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import AuthCallback from './components/AuthCallback';
import Activities from './components/Activities';

function App() {
    return (
        <Router>
            <Routes>
                {/* Page d'accueil avec le bouton */}
                <Route path="/" element={<Login />} />

                {/* La route de callback qui correspond à ton VITE_STRAVA_REDIRECT_URI */}
                <Route path="/redirect" element={<AuthCallback />} />

                {/* La future page avec tes tuiles */}
                <Route path="/activities" element={<Activities />} />
            </Routes>
        </Router>
    );
}

export default App;