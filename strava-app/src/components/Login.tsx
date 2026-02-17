export default function Login() {
    const handleLogin = () => {
        const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_STRAVA_REDIRECT_URI;
        // 'activity:read_all' est la permission nécessaire pour lire les tracés
        const scope = 'activity:read_all';

        // Construction de l'URL de redirection vers Strava
        const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;

        window.location.href = stravaAuthUrl;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px' }}>
            <h1>Mon App Strava</h1>
            <button
                onClick={handleLogin}
                style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#FC4C02', color: 'white', border: 'none', borderRadius: '5px' }}
            >
                Se connecter avec Strava
            </button>
        </div>
    );
}