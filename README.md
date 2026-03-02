# Strav'Analyse 🏃‍♂️💨

Bienvenue sur **Strav'Analyse**, une application React conçue pour plonger au cœur des performances sportives et optimiser la préparation marathon grâce à l'analyse de données et à l'Intelligence Artificielle.

🌐 **Accéder au projet en ligne :** [https://stravanalyse.alwaysdata.net/](https://stravanalyse.alwaysdata.net/)

---

## ⚠️ À L'ATTENTION DE L'UTILISATEUR ⚠️

**L'API Strava impose une restriction stricte en mode développement** limitant la connexion à un seul et unique compte (celui du développeur).

Par conséquent, pour pouvoir évaluer et tester toutes les fonctionnalités de ce projet, **vous devez impérativement utiliser le Mode Démo**.

👉 Sur la page de connexion, cliquez sur le bouton : **"👀 Tester l'application (Mode Démo)"**.
Ce mode contourne l'authentification Strava et charge un set de fichiers `.gpx` locaux complets, vous permettant de naviguer dans l'interface, de voir les graphiques et de tester l'IA comme si vous étiez connecté avec un vrai compte bien fourni.

---

## ✨ Fonctionnalités Principales

Ce projet n'est pas juste un simple lecteur de flux Strava, c'est un véritable outil d'analyse :

* **Dashboard & Statistiques** : Visualisation des kilomètres parcourus, listing des séances (filtrées sur la course à pied) et historique des dernières semaines.
* **Analyse détaillée des sorties** :
    * Cartographie interactive du tracé (via Leaflet).
    * Graphiques dynamiques (Recharts) synchronisés sur la distance : Allure, Fréquence Cardiaque, Cadence, Puissance, et Profil d'altitude.
    * Calculs avancés : Suffer Score, temps intermédiaires (splits) et performances sur les segments.
* **Modélisation de la Performance (Bannister)** :
    * Anticipation de la forme le jour J via les courbes CTL (Niveau), ATL (Fatigue) et TSB (Forme).
    * Deux modèles implémentés : Basé sur le TRIMP (Heart Rate) et sur le TSS (Training Stress Score).
* **Analyseur GPX Custom & GAP** : Un algorithme maison (utilisant un filtre de Kalman 1D) pour lisser les données d'élévation et calculer l'Allure Ajustée à la Pente (GAP / Minetti) kilomètre par kilomètre.
* **Coach IA Intégré** : Utilisation de l'API Mistral AI pour générer une analyse personnalisée de la séance et proposer les prochaines étapes adaptées à un objectif précis (Marathon en 3h45).

## 🛠️ Stack Technique

* **Frontend** : React.js (avec TypeScript)
* **Routage** : React Router DOM
* **Requêtes HTTP** : Axios
* **Graphiques** : Recharts
* **Cartographie** : React-Leaflet & Mapbox Polyline
* **Manipulation des dates** : Date-fns
* **Intelligence Artificielle** : SDK `@mistralai/mistralai`
* **Algorithmique** : Parseur DOM XML pour les fichiers GPX, Filtre de Kalman 1D.

## Rapport

Le rapport de SAP se trouve également à la racine du projet.