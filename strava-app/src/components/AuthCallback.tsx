import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const hasFetched = useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');

        if (code && !hasFetched.current) {
            hasFetched.current = true;

            const fetchToken = async () => {
                try {
                    const response = await axios.post('https://www.strava.com/oauth/token', {
                        client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
                        client_secret: import.meta.env.VITE_STRAVA_CLIENT_SECRET,
                        code: code,
                        grant_type: 'authorization_code',
                    });

                    localStorage.setItem('strava_access_token', response.data.access_token);
                    localStorage.setItem('strava_refresh_token', response.data.refresh_token);

                    navigate('/activities');
                } catch (error: any) {
                    console.error("Détails de l'erreur :", error);
                    setErrorMsg(error.response?.data?.message || error.message || "Erreur inconnue.");
                }
            };

            fetchToken();
        } else if (!code && !hasFetched.current) {
            setErrorMsg("Aucun code d'autorisation reçu.");
        }
    }, [navigate, searchParams]);

    if (errorMsg) {
        return (
            <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>
                <h2>L'authentification a échoué</h2>
                <p>{errorMsg}</p>
            </div>
        );
    }

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <p>Connexion à Strava en cours, veuillez patienter...</p>
        </div>
    );
}