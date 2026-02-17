// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import AuthCallback from './components/AuthCallback';

// Un composant temporaire en attendant de créer la vraie page
const ActivitiesPlaceholder = () => (
    <h2 style={{ textAlign: 'center' }}>Liste des activités (À venir !)</h2>
);

function App() {
    return (
        <Router>
            <Routes>
                {/* Page d'accueil avec le bouton */}
                <Route path="/" element={<Login />} />

                {/* La route de callback qui correspond à ton VITE_STRAVA_REDIRECT_URI */}
                <Route path="/redirect" element={<AuthCallback />} />

                {/* La future page avec tes tuiles */}
                <Route path="/activities" element={<ActivitiesPlaceholder />} />
            </Routes>
        </Router>
    );
}

export default App;