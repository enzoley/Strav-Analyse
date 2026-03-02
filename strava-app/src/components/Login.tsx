import './Login.css';

export default function Login() {
    const handleLogin = () => {
        const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_STRAVA_REDIRECT_URI;
        const scope = 'activity:read_all,profile:read_all';

        const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;

        window.location.href = stravaAuthUrl;
    };

    const handleDemoLogin = () => {
        localStorage.setItem('demo_mode', 'true');
        window.location.href = '/activities';
    };

    return (
        <div className="login-container">
            <div className="login-card">

                <div className="logo-container">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3v18h18"/>
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                        <path d="M18.7 4l-5.1 5.2-2.8-2.7L7 10.3" opacity="0.5"/>
                    </svg>
                </div>

                <h1 className="login-title">Strav'Analyse</h1>
                <p className="login-subtitle">
                    Plongez au cœur de vos performances. Analysez vos courses comme un pro et optimisez votre
                    préparation marathon.
                </p>

                <button onClick={handleLogin} className="strava-connect-btn">
                    <svg role="img" viewBox="0 0 24 24" width="20" height="20" fill="white"
                         xmlns="http://www.w3.org/2000/svg"><title>Strava icon</title>
                        <path
                            d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                    </svg>
                    Se connecter avec Strava
                </button>

                <button
                    onClick={handleDemoLogin}
                    className="strava-connect-btn"
                    style={{marginTop: '15px', backgroundColor: '#242428', border: '1px solid #383838'}}
                >
                    👀 Tester l'application (Mode Démo)
                </button>
            </div>
        </div>
    );
}