// src/components/AIAnalysis.tsx
import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StravaActivityDetailed } from '../types/strava';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisProps {
    activity: StravaActivityDetailed;
}

export default function AIAnalysis({ activity }: AIAnalysisProps) {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateAnalysis = async () => {
        setLoading(true);
        setError(null);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

            const modelsReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const modelsData = await modelsReq.json();

            const validModel = modelsData.models?.find((m: any) =>
                m.supportedGenerationMethods?.includes("generateContent") &&
                m.name.includes("gemini")
            );

            if (!validModel) {
                throw new Error("Aucun modèle IA n'est autorisé pour cette clé.");
            }

            const modelName = validModel.name.replace('models/', '');
            console.log("Modèle IA utilisé :", modelName);

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });

            const { map, ...activityDataForAI } = activity;

            const prompt = `
        Tu es un coach d'athlétisme expert, spécialisé dans la préparation marathon. 
        Ton athlète s'entraîne 4 fois par semaine pour un marathon prévu le 26 avril avec un objectif de 3h45 (ce qui correspond à une allure cible d'environ 5:19/km) et il a une FC max de 202.
        
        Voici l'ensemble des données brutes de sa dernière sortie au format JSON :
        ${JSON.stringify(activityDataForAI, null, 2)}

        Rédige ta réponse en 3 parties claires :
        1. Analyse de la séance : Analyse brièvement cette sortie (intensité, effort, pertinence dans le cadre de la prépa marathon) et encourage-le. Varie toujours tes formulations pour ne jamais être répétitif d'une analyse à l'autre.
        2. Optimisation & Récupération : Donne UN conseil hyper précis et expert (nutrition, hydratation, sommeil, étirements ciblés, cryothérapie, stratégie mentale, etc.). Interdiction de donner toujours le même conseil, sois original et pointu !
        3. Prochaines étapes du plan : Propose le détail de ses 4 prochaines sorties pour la semaine, optimisées pour viser 3h45 ajuste en fonction de la date de la séance vis à vis de l'objectif :
           - 1 séance de fractionné (précise les durées/distances d'effort, de récupération et les allures cibles).
           - 1 sortie en Endurance Fondamentale (EF) (précise la durée et l'allure ou la FC cible).
           - 1 séance de côtes (précise le nombre de répétitions, la durée de l'effort et la récup).
           - 1 sortie longue (précise le kilométrage cible et les éventuels blocs à allure marathon).
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            setAnalysis(response.text());

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Désolé, le coach IA est indisponible pour le moment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-card">
            <div className="ai-header">
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <h2 className="ai-title">L'analyse du Coach IA</h2>
            </div>

            {!analysis && !loading && (
                <button className="ai-button" onClick={generateAnalysis}>
                    Générer une analyse personnalisée
                </button>
            )}

            {loading && <p>L'IA analyse tes performances... ⏳</p>}

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {analysis && (
                <div className="ai-content">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
            )}
        </div>
    );
}