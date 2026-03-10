import React, { useState, useEffect, Fragment, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ⬇️⬇️⬇️ YOUR FIREBASE KEYS ARE NOW INJECTED HERE ⬇️⬇️⬇️
const FIREBASE_KEYS = {
  apiKey: "AIzaSyCwIw7-5Grb49Yb4uViAZnPZqKYJuDLb94",
  authDomain: "nhl-playoff-pool-2026.firebaseapp.com",
  projectId: "nhl-playoff-pool-2026",
  storageBucket: "nhl-playoff-pool-2026.firebasestorage.app",
  messagingSenderId: "58976424985",
  appId: "1:58976424985:web:b8790dbaa95085dc3e0688"
};
// ⬆️⬆️⬆️ YOUR FIREBASE KEYS ARE NOW INJECTED HERE ⬆️⬆️⬆️

// --- INJECT TAILWIND CSS ---
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

let poolConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
if (!poolConfig.apiKey) poolConfig = FIREBASE_KEYS;

const isConfigured = Boolean(poolConfig.apiKey && poolConfig.apiKey !== "YOUR_API_KEY");

const poolApp = isConfigured ? (getApps().length === 0 ? initializeApp(poolConfig) : getApp()) : null;
const poolAuth = isConfigured ? getAuth(poolApp) : null;
const poolDb = isConfigured ? getFirestore(poolApp) : null;
const poolId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/**
 * LIGHTWEIGHT SVG ICON SYSTEM
 */
const HockeyIcon = ({ name, className = "" }) => {
  const mergedClassName = `w-5 h-5 shrink-0 ${className}`;
  
  if (name === 'Trophy') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
  if (name === 'Users') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (name === 'Activity') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
  if (name === 'Edit3') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
  if (name === 'ChevronDown') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><polyline points="6 9 12 15 18 9"/></svg>;
  if (name === 'Goal') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M12 13V2l8 4-8 4"/><path d="M20.55 10.23A9 9 0 1 1 8 4.94"/><path d="M8 10a5 5 0 1 0 8.9 2.02"/></svg>;
  if (name === 'CheckCircle2') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === 'AlertCircle') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  if (name === 'Calendar') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  if (name === 'Medal') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><polyline points="12 18 13 16 14 17"/></svg>;
  if (name === 'LayoutDashboard') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
  if (name === 'Settings') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  if (name === 'Plus') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
  if (name === 'Trash2') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
  if (name === 'Loader2') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
  if (name === 'LogIn') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>;
  if (name === 'Share2') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
  if (name === 'Sparkles') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
  if (name === 'MessageSquare') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  if (name === 'Bell') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
  if (name === 'BellOff') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
  if (name === 'User') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}></svg>;
};

const NavItem = ({ id, icon, label, activeTab, setActiveTab }) => {
  const isActive = activeTab === id;
  return (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:p-3 rounded-xl transition-all ${
        isActive 
          ? 'text-white bg-blue-600/10 md:bg-blue-600 md:shadow-lg shadow-blue-500/20' 
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
      }`}
    >
      <div className={isActive ? 'md:text-white text-blue-500' : ''}>
        {icon}
      </div>
      <span className={`text-[10px] md:text-sm font-bold ${isActive ? 'md:font-semibold' : ''}`}>
        {label}
      </span>
    </button>
  );
};

const callGemini = async (prompt) => {
  const apiKey = "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < delays.length + 1; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No insights available.";
    } catch (error) {
      if (i === delays.length) return "Failed to connect to the AI analyst. Please try again later.";
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

// --- Static Data & Point Values ---
const TEAMS = ["NYR", "WSH", "CAR", "NYI", "FLA", "TBL", "BOS", "TOR", "DAL", "VGK", "WPG", "COL", "VAN", "NSH", "EDM", "LAK"];
const EAST_TEAMS = ["NYR", "WSH", "CAR", "NYI", "FLA", "TBL", "BOS", "TOR"];
const WEST_TEAMS = ["DAL", "VGK", "WPG", "COL", "VAN", "NSH", "EDM", "LAK"];

const POINT_VALUES = {
  r1: { winner: 2, goal: 1, points: 1 },
  r2: { winner: 4, goal: 2, points: 2 },
  r3: { winner: 6, goal: 3, points: 3 },
  r4: { winner: 10, goal: 5, points: 5 } // Goal/Points here can be used for Conn Smythe
};

const getLogo = (abbrev) => abbrev ? `https://assets.nhle.com/logos/nhl/svg/${abbrev}_light.svg` : '';

const ROUND_MATCHUPS_STRUCTURE = {
  r1: [
    { id: 'E1', region: 'East', poolT1: ['NYR'], poolT2: ['WSH'], defaultTeams: { t1: 'NYR', t2: 'WSH' } },
    { id: 'E2', region: 'East', poolT1: ['FLA'], poolT2: ['TBL'], defaultTeams: { t1: 'FLA', t2: 'TBL' } },
    { id: 'E3', region: 'East', poolT1: ['CAR'], poolT2: ['NYI'], defaultTeams: { t1: 'CAR', t2: 'NYI' } },
    { id: 'E4', region: 'East', poolT1: ['BOS'], poolT2: ['TOR'], defaultTeams: { t1: 'BOS', t2: 'TOR' } },
    { id: 'W1', region: 'West', poolT1: ['DAL'], poolT2: ['VGK'], defaultTeams: { t1: 'DAL', t2: 'VGK' } },
    { id: 'W2', region: 'West', poolT1: ['VAN'], poolT2: ['NSH'], defaultTeams: { t1: 'VAN', t2: 'NSH' } },
    { id: 'W3', region: 'West', poolT1: ['WPG'], poolT2: ['COL'], defaultTeams: { t1: 'WPG', t2: 'COL' } },
    { id: 'W4', region: 'West', poolT1: ['EDM'], poolT2: ['LAK'], defaultTeams: { t1: 'EDM', t2: 'LAK' } },
  ],
  r2: [
    { id: 'ES1', region: 'East', poolT1: EAST_TEAMS, poolT2: EAST_TEAMS },
    { id: 'ES2', region: 'East', poolT1: EAST_TEAMS, poolT2: EAST_TEAMS },
    { id: 'WS1', region: 'West', poolT1: WEST_TEAMS, poolT2: WEST_TEAMS },
    { id: 'WS2', region: 'West', poolT1: WEST_TEAMS, poolT2: WEST_TEAMS },
  ],
  r3: [
    { id: 'EF', region: 'East', poolT1: EAST_TEAMS, poolT2: EAST_TEAMS },
    { id: 'WF', region: 'West', poolT1: WEST_TEAMS, poolT2: WEST_TEAMS },
  ],
  r4: [
    { id: 'SCF', region: 'Cup Final', poolT1: EAST_TEAMS, poolT2: WEST_TEAMS },
  ]
};

const ALL_MATCHUP_IDS = [
  ...ROUND_MATCHUPS_STRUCTURE.r1.map(m => m.id),
  ...ROUND_MATCHUPS_STRUCTURE.r2.map(m => m.id),
  ...ROUND_MATCHUPS_STRUCTURE.r3.map(m => m.id),
  ...ROUND_MATCHUPS_STRUCTURE.r4.map(m => m.id)
];

const DEFAULT_PICKS = ALL_MATCHUP_IDS.reduce((acc, id) => {
  acc[id] = { winner: '', p1: '', p2: '', topGoalScorer: '', topPointScorer: '' };
  return acc;
}, {});

const TEAM_ROSTERS = {
  "NYR": [{ name: "A. Panarin" }, { name: "M. Zibanejad" }, { name: "C. Kreider" }, { name: "V. Trocheck" }],
  "WSH": [{ name: "A. Ovechkin" }, { name: "D. Strome" }, { name: "J. Carlson" }, { name: "T. Wilson" }],
  "CAR": [{ name: "S. Aho" }, { name: "A. Svechnikov" }, { name: "J. Guentzel" }, { name: "S. Jarvis" }],
  "NYI": [{ name: "M. Barzal" }, { name: "B. Horvat" }, { name: "B. Nelson" }, { name: "K. Palmieri" }],
  "FLA": [{ name: "A. Barkov" }, { name: "M. Tkachuk" }, { name: "S. Reinhart" }, { name: "C. Verhaeghe" }],
  "TBL": [{ name: "N. Kucherov" }, { name: "B. Point" }, { name: "S. Stamkos" }, { name: "V. Hedman" }],
  "BOS": [{ name: "D. Pastrnak" }, { name: "B. Marchand" }, { name: "C. McAvoy" }, { name: "C. Coyle" }],
  "TOR": [{ name: "A. Matthews" }, { name: "M. Marner" }, { name: "W. Nylander" }, { name: "J. Tavares" }],
  "DAL": [{ name: "J. Robertson" }, { name: "R. Hintz" }, { name: "M. Heiskanen" }, { name: "W. Johnston" }],
  "VGK": [{ name: "J. Eichel" }, { name: "J. Marchessault" }, { name: "M. Stone" }, { name: "N. Hanifin" }],
  "WPG": [{ name: "M. Scheifele" }, { name: "K. Connor" }, { name: "J. Morrissey" }, { name: "N. Ehlers" }],
  "COL": [{ name: "N. MacKinnon" }, { name: "M. Rantanen" }, { name: "C. Makar" }, { name: "V. Nichushkin" }],
  "VAN": [{ name: "E. Pettersson" }, { name: "J. Miller" }, { name: "Q. Hughes" }, { name: "B. Boeser" }],
  "NSH": [{ name: "F. Forsberg" }, { name: "R. Josi" }, { name: "R. O'Reilly" }, { name: "G. Nyquist" }],
  "EDM": [{ name: "C. McDavid" }, { name: "L. Draisaitl" }, { name: "Z. Hyman" }, { name: "E. Bouchard" }],
  "LAK": [{ name: "A. Kopitar" }, { name: "K. Fiala" }, { name: "A. Kempe" }, { name: "V. Arvidsson" }],
};

const MOCK_GAMES = [
  { id: 1, gameState: "LIVE", clock: { timeRemaining: "12:34", period: 2 }, awayTeam: { abbrev: "NYR", score: 2 }, homeTeam: { abbrev: "WSH", score: 1 } }
];

const MOCK_GIFS = [
  "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDB5czI5d3hpYTI4NXZzZ3NrcHpsa3VyaHhsdDBkZDgyYWxyd2NnciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7WIBGvwA4YlHkZpK/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGZyNW0xaHFjdWFwNWV1MjdveTZrdWVjcDVkOXF2OW5rYmJ1OHFqZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT1XGY8u2hJEM35Vhm/giphy.gif",
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpjc2htY2szbzlkYnBhMzhtZncyd3ZzYWVjdDlzYnV6bmJpd285diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlJDaeqNfC08ZkA/giphy.gif"
];

// --- Helper: Points Calculation ---
const calculateParticipantScore = (picks, officialResults) => {
  if (!picks || !officialResults) return 0;
  let total = 0;

  Object.entries(ROUND_MATCHUPS_STRUCTURE).forEach(([roundKey, matchups]) => {
    const roundValues = POINT_VALUES[roundKey];
    matchups.forEach(m => {
      const userPick = picks[m.id];
      const actual = officialResults[m.id];
      if (!userPick || !actual) return;

      if (actual.winner && userPick.winner === actual.winner) total += roundValues.winner;
      if (actual.topGoalScorer && userPick.topGoalScorer === actual.topGoalScorer) total += roundValues.goal;
      if (actual.topPointScorer && userPick.topPointScorer === actual.topPointScorer) total += roundValues.points;
    });
  });

  return total;
};

// --- Main App Component ---
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState(null); 
  const [picksLoaded, setPicksLoaded] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [myPicks, setMyPicks] = useState({ cupWinner: '', series: DEFAULT_PICKS });
  const [liveGames, setLiveGames] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [trashTalk, setTrashTalk] = useState({});
  
  // Chat & Admin State
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGifs, setShowGifs] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [updateNameInput, setUpdateNameInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // LIVE SETTINGS
  const [liveMatchups, setLiveMatchups] = useState({});
  const [officialResults, setOfficialResults] = useState({});

  const chatEndRef = useRef(null);
  const prevMessagesLength = useRef(0);

  // Computed Leaderboard
  const processedParticipants = useMemo(() => {
    return participants.map(p => ({
      ...p,
      calculatedPoints: calculateParticipantScore(p.picks, officialResults)
    })).sort((a, b) => b.calculatedPoints - a.calculatedPoints);
  }, [participants, officialResults]);

  useEffect(() => {
    if (!isConfigured) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(poolAuth, __initial_auth_token);
        } else {
          await signInAnonymously(poolAuth);
        }
      } catch (err) { console.error(err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(poolAuth, (curr) => {
      setUser(curr);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Initialize notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Fetch Settings (Matchups & Results)
  useEffect(() => {
    if (!user || !isConfigured) return;
    const matchRef = doc(poolDb, 'artifacts', poolId, 'public', 'data', 'settings', 'matchups');
    const unsubMatch = onSnapshot(matchRef, (snap) => {
      if (snap.exists()) setLiveMatchups(snap.data());
    });

    const resultsRef = doc(poolDb, 'artifacts', poolId, 'public', 'data', 'settings', 'results');
    const unsubResults = onSnapshot(resultsRef, (snap) => {
      if (snap.exists()) setOfficialResults(snap.data());
    });

    return () => { unsubMatch(); unsubResults(); };
  }, [user]);

  // Fetch Participants
  useEffect(() => {
    if (!user || !isConfigured) return;
    const colRef = collection(poolDb, 'artifacts', poolId, 'public', 'data', 'participants');
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const parts = [];
      let me = null;
      snap.forEach(d => {
        const data = d.data();
        parts.push({ id: d.id, ...data });
        if (d.id === user.uid || (data.uids && data.uids.includes(user.uid))) {
          me = { id: d.id, ...data };
        }
      });
      setParticipants(parts);
      setLoadingData(false);
      if (me) {
        setHasJoined(true);
        setMyParticipantId(me.id);
        if (!picksLoaded) {
          const mergedSeries = { ...DEFAULT_PICKS, ...(me.picks || {}) };
          setMyPicks({ cupWinner: me.cupPick || '', series: mergedSeries });
          setPicksLoaded(true);
        }
      } else {
        setHasJoined(false);
      }
    }, (err) => {
      console.error(err);
      setLoadingData(false);
    });
    return () => unsubscribe();
  }, [user, picksLoaded]);

  // Fetch Chat
  useEffect(() => {
    if (!user || !hasJoined || !isConfigured) return;
    const chatRef = collection(poolDb, 'artifacts', poolId, 'public', 'data', 'chat');
    const unsubscribe = onSnapshot(chatRef, (snap) => {
      const msgs = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); 
      setChatMessages(msgs);
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user, hasJoined]);

  // Chat notification observer
  useEffect(() => {
    if (chatMessages.length > prevMessagesLength.current) {
      if (prevMessagesLength.current > 0 && notificationsEnabled) {
        const newMsg = chatMessages[chatMessages.length - 1];
        if (newMsg.uid !== user?.uid) {
          if (activeTab !== 'chat' || (typeof document !== 'undefined' && document.hidden)) {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try { new Notification(`IcePool: ${newMsg.senderName}`, { body: newMsg.text.includes('http') ? 'Sent a GIF' : newMsg.text }); } catch (e) {}
            }
          }
        }
      }
      prevMessagesLength.current = chatMessages.length;
    }
  }, [chatMessages, notificationsEnabled, user, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  useEffect(() => {
    const me = participants.find(p => p.id === myParticipantId);
    if (me && !updateNameInput) setUpdateNameInput(me.name);
  }, [participants, myParticipantId, updateNameInput]);

  useEffect(() => {
    let isMounted = true;
    const fetchNHLData = async () => {
      try {
        const res = await fetch('https://api-web.nhle.com/v1/score/now');
        const data = await res.json();
        if (isMounted) setLiveGames(data.games?.length > 0 ? data.games : MOCK_GAMES);
      } catch (err) {
        if (isMounted) setLiveGames(MOCK_GAMES);
      }
    };
    fetchNHLData();
    const interval = setInterval(fetchNHLData, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const handleSeriesPick = (matchupId, field, value) => {
    setMyPicks(prev => {
      const currentItem = prev.series[matchupId] || { winner: '', p1: '', p2: '', topGoalScorer: '', topPointScorer: '' };
      const updatedSeries = { ...prev.series, [matchupId]: { ...currentItem, [field]: value } };
      return { ...prev, series: updatedSeries };
    });
  };

  const handleSavePicks = async () => {
    if (!user || !hasJoined || !myParticipantId) return;
    try {
      await updateDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', myParticipantId), {
        cupPick: myPicks.cupWinner, picks: myPicks.series
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) { console.error(err); }
  };

  const handleJoinPool = async (e) => {
    e.preventDefault();
    const name = newParticipantName.trim();
    if (!name || !user) return;
    const existingUser = participants.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingUser) {
      const currentUids = existingUser.uids || [existingUser.id];
      if (!currentUids.includes(user.uid)) {
        try { await updateDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', existingUser.id), { uids: [...currentUids, user.uid] }); } catch (err) {}
      }
      setNewParticipantName('');
      return; 
    }
    try {
      await setDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', user.uid), {
        name, points: 0, cupPick: "", avatar: name.substring(0, 2).toUpperCase(), picks: DEFAULT_PICKS, uids: [user.uid] 
      });
      setNewParticipantName('');
    } catch (err) {}
  };

  const toggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (notificationsEnabled) setNotificationsEnabled(false);
    else if (Notification.permission === 'granted') setNotificationsEnabled(true);
    else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') setNotificationsEnabled(true);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !myParticipantId) return;
    const myName = participants.find(p => p.id === myParticipantId)?.name || 'Anonymous';
    const msgText = newMessage.trim();
    setNewMessage(''); 
    setShowGifs(false);
    try {
      await setDoc(doc(collection(poolDb, 'artifacts', poolId, 'public', 'data', 'chat')), {
        text: msgText, uid: user.uid, senderName: myName, timestamp: Date.now()
      });
    } catch (err) {}
  };

  const renderMessageText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(/(https?:\/\/[^\s]+(\.gif|\.jpg|\.jpeg|\.png|\.webp))/i)) return <img key={i} src={part} alt="" className="max-w-full rounded-lg mt-2 max-h-48 border border-slate-700/50 shadow-sm" />;
      if (part.match(urlRegex)) return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-300 underline break-all">{part}</a>;
      return <span key={i} className="break-words">{part}</span>;
    });
  };

  const handleUpdateParticipant = async (id, field, value) => {
    try {
      const val = (field === 'points') ? Number(value) : value;
      await updateDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', id), { [field]: val });
    } catch (err) {}
  };

  const handleRemoveParticipant = async (id) => {
    try { await deleteDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', id)); } catch (err) {}
  };

  const handleUpdateLiveMatchup = async (mid, side, team) => {
    const current = liveMatchups[mid] || { t1: '', t2: '' };
    const update = { ...liveMatchups, [mid]: { ...current, [side]: team } };
    setLiveMatchups(update);
    try { await setDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'settings', 'matchups'), update); } catch (err) {}
  };

  const handleUpdateOfficialResult = async (mid, field, value) => {
    const current = officialResults[mid] || { winner: '', topGoalScorer: '', topPointScorer: '' };
    const update = { ...officialResults, [mid]: { ...current, [field]: value } };
    setOfficialResults(update);
    try { await setDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'settings', 'results'), update); } catch (err) {}
  };

  const handleCopyLink = () => {
    const el = document.createElement('textarea');
    el.value = window.location.href;
    document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    setCopySuccess(true); setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleGenerateAnalysis = async (seriesId, t1, t2) => {
    if (!t1 || !t2) return;
    setAiAnalysis(prev => ({ ...prev, [seriesId]: { loading: true, text: '' } }));
    const text = await callGemini(`Analyze NHL series: ${t1} vs ${t2}. Max 3 sentences, end with a prediction.`);
    setAiAnalysis(prev => ({ ...prev, [seriesId]: { loading: false, text } }));
  };

  const handleGenerateTrashTalk = async (opponent) => {
    if (!user) return;
    setTrashTalk(prev => ({ ...prev, [opponent.id]: { loading: true, text: '' } }));
    const text = await callGemini(`Write PG trash talk to ${opponent.name}. Max 2 sentences, no emojis.`);
    setTrashTalk(prev => ({ ...prev, [opponent.id]: { loading: false, text } }));
  };

  const getCombinedRoster = (t1, t2) => {
    const r1 = TEAM_ROSTERS[t1] || [];
    const r2 = TEAM_ROSTERS[t2] || [];
    return [...r1, ...r2].sort((a, b) => a.name.localeCompare(b.name));
  };

  if (!isConfigured) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-300"><div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl"><h2>Firebase Keys Missing</h2></div></div>;
  if (loadingAuth || (user && loadingData)) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 flex-col gap-4 font-bold"><HockeyIcon name="Loader2" className="animate-spin w-12 h-12" /> Loading IcePool '26...</div>;

  if (user && !hasJoined) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20"><HockeyIcon name="Goal" className="text-white w-8 h-8" /></div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to IcePool '26</h2>
        <form onSubmit={handleJoinPool} className="flex flex-col gap-4 mt-6">
          <input type="text" placeholder="Display Name" value={newParticipantName} onChange={(e) => setNewParticipantName(e.target.value)} className="bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-center outline-none focus:border-blue-500"/>
          <button type="submit" className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold transition-transform active:scale-95">Join Pool</button>
          <p className="text-slate-400 text-xs italic mt-2">You can always change your display name later.</p>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden">
      <nav className="fixed md:sticky bottom-0 md:top-0 w-full md:w-64 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 z-50 h-16 md:h-screen flex flex-row md:flex-col p-2 md:p-6 justify-around md:justify-start">
        <div className="hidden md:flex items-center gap-3 mb-10">
          <HockeyIcon name="Goal" className="text-blue-500" />
          <h1 className="text-xl font-bold">IcePool '26</h1>
        </div>
        <div className="flex md:flex-col w-full gap-2">
          <NavItem id="dashboard" icon={<HockeyIcon name="LayoutDashboard"/>} label="Home" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="mypicks" icon={<HockeyIcon name="Edit3" />} label="My Picks" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="standings" icon={<HockeyIcon name="Medal" />} label="Standings" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="chat" icon={<HockeyIcon name="MessageSquare" />} label="Chat" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="admin" icon={<HockeyIcon name="Settings" />} label="Admin" activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        
        <div className="hidden md:block mt-auto pt-4 border-t border-slate-800 text-center">
          <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-slate-800/50 p-3 rounded-xl hover:bg-slate-800">
            {copySuccess ? <HockeyIcon name="CheckCircle2" className="w-4 h-4 text-green-400"/> : <HockeyIcon name="Share2" className="w-4 h-4"/>}
            {copySuccess ? 'Copied Link!' : 'Invite Friends'}
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold capitalize">{activeTab.replace(/([A-Z])/g, ' $1').trim()}</h2>
            <p className="text-slate-400 text-sm">Welcome back, <span className="text-blue-400 font-semibold">{participants.find(p => p.id === myParticipantId)?.name || 'Player'}</span></p>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-slate-400 text-sm">Pts</span>
            <span className="text-xl font-bold text-white">{processedParticipants.find(p => p.id === myParticipantId)?.calculatedPoints || 0}</span>
          </div>
        </header>

        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 rounded-2xl border border-blue-800 shadow-xl shadow-blue-900/20 col-span-1 lg:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <HockeyIcon name="Activity" className="text-blue-400" />
                  <h3 className="font-bold text-lg">Live & Recent Games</h3>
                </div>
                <div className="space-y-3">
                  {liveGames.map((game, i) => (
                    <div key={game.id || i} className="bg-slate-950/50 p-4 rounded-xl flex items-center justify-between border border-slate-800">
                      <div className="flex items-center gap-3">
                        <img src={getLogo(game.awayTeam?.abbrev)} className="w-8 h-8 object-contain" alt="" />
                        <span className="font-bold w-12">{game.awayTeam?.abbrev}</span>
                        <span className="text-xl font-mono">{game.awayTeam?.score}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                        {game.gameState === 'LIVE' ? <span className="text-red-400 animate-pulse">LIVE {game.clock?.timeRemaining} P{game.clock?.period}</span> : 'FINAL'}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-mono">{game.homeTeam?.score}</span>
                        <span className="font-bold w-12 text-right">{game.homeTeam?.abbrev}</span>
                        <img src={getLogo(game.homeTeam?.abbrev)} className="w-8 h-8 object-contain" alt="" />
                      </div>
                    </div>
                  ))}
                  {liveGames.length === 0 && <p className="text-slate-400 text-sm">No games right now. Check back later!</p>}
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <HockeyIcon name="Trophy" className="text-yellow-400" />
                  <h3 className="font-bold text-lg">Top 3 Standings</h3>
                </div>
                <div className="space-y-4">
                  {processedParticipants.slice(0, 3).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-500 text-yellow-950' : i === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-700 text-orange-100'}`}>
                          #{i + 1}
                        </div>
                        <span className="font-semibold">{p.name}</span>
                      </div>
                      <span className="font-mono text-blue-400">{p.calculatedPoints} pt</span>
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('standings')} className="w-full text-center text-sm text-blue-400 mt-4 hover:underline">View Full Standings</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MY PICKS TAB --- */}
        {activeTab === 'mypicks' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 sticky top-0 md:top-4 z-40">
              <span className="text-sm text-slate-400">Make your predictions. Don't forget to save!</span>
              <button 
                onClick={handleSavePicks} 
                className={`px-6 py-2 rounded-lg font-bold transition-all ${saveSuccess ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {saveSuccess ? 'Saved!' : 'Save Picks'}
              </button>
            </div>

            <div className="mb-6 bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-lg mb-4 text-blue-400">Stanley Cup Champion Pick</h3>
              <select 
                value={myPicks.cupWinner || ''} 
                onChange={(e) => setMyPicks(prev => ({ ...prev, cupWinner: e.target.value }))}
                className="w-full md:w-1/2 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
              >
                <option value="">Select Cup Winner...</option>
                {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>

            {Object.entries(ROUND_MATCHUPS_STRUCTURE).map(([roundId, matchups], idx) => (
              <div key={roundId} className="space-y-4">
                <h3 className="text-xl font-bold border-b border-slate-800 pb-2">Round {idx + 1} Matchups</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {matchups.map(m => {
                    const t1 = liveMatchups[m.id]?.t1 || m.defaultTeams?.t1;
                    const t2 = liveMatchups[m.id]?.t2 || m.defaultTeams?.t2;
                    const combinedRoster = getCombinedRoster(t1, t2);
                    const pick = myPicks.series[m.id] || { winner: '', topGoalScorer: '', topPointScorer: '' };

                    return (
                      <div key={m.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center">
                              {t1 ? <img src={getLogo(t1)} alt={t1} className="w-10 h-10 object-contain"/> : <div className="w-10 h-10 bg-slate-800 rounded-full animate-pulse"/>}
                              <span className="text-xs font-bold mt-1 text-slate-400">{t1 || 'TBD'}</span>
                            </div>
                            <span className="text-slate-600 font-bold text-sm">VS</span>
                            <div className="flex flex-col items-center">
                              {t2 ? <img src={getLogo(t2)} alt={t2} className="w-10 h-10 object-contain"/> : <div className="w-10 h-10 bg-slate-800 rounded-full animate-pulse"/>}
                              <span className="text-xs font-bold mt-1 text-slate-400">{t2 || 'TBD'}</span>
                            </div>
                          </div>
                          
                          {t1 && t2 && (
                            <button 
                              onClick={() => handleGenerateAnalysis(m.id, t1, t2)}
                              disabled={aiAnalysis[m.id]?.loading}
                              className="text-xs bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <HockeyIcon name="Sparkles" className="w-3 h-3" />
                              {aiAnalysis[m.id]?.loading ? 'Thinking...' : 'AI Insights'}
                            </button>
                          )}
                        </div>

                        {aiAnalysis[m.id]?.text && (
                          <div className="mb-4 bg-purple-900/20 border border-purple-800/50 p-3 rounded-xl text-xs text-purple-200">
                            {aiAnalysis[m.id].text}
                          </div>
                        )}

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-500 font-semibold uppercase">Series Winner</label>
                            <select 
                              value={pick.winner}
                              onChange={(e) => handleSeriesPick(m.id, 'winner', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm mt-1 focus:border-blue-500 outline-none"
                            >
                              <option value="">Select Winner...</option>
                              {t1 && <option value={t1}>{t1}</option>}
                              {t2 && <option value={t2}>{t2}</option>}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-500 font-semibold uppercase">Most Goals</label>
                              <select 
                                value={pick.topGoalScorer}
                                onChange={(e) => handleSeriesPick(m.id, 'topGoalScorer', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm mt-1 focus:border-blue-500 outline-none"
                              >
                                <option value="">Player...</option>
                                {combinedRoster.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 font-semibold uppercase">Most Points</label>
                              <select 
                                value={pick.topPointScorer}
                                onChange={(e) => handleSeriesPick(m.id, 'topPointScorer', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm mt-1 focus:border-blue-500 outline-none"
                              >
                                <option value="">Player...</option>
                                {combinedRoster.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- STANDINGS TAB --- */}
        {activeTab === 'standings' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-sm">
                  <tr>
                    <th className="p-4 font-semibold w-16">Rank</th>
                    <th className="p-4 font-semibold">Player</th>
                    <th className="p-4 font-semibold text-center">Cup Pick</th>
                    <th className="p-4 font-semibold text-right">Points</th>
                    <th className="p-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {processedParticipants.map((p, idx) => (
                    <tr key={p.id} className={`hover:bg-slate-800/20 transition-colors ${p.id === myParticipantId ? 'bg-blue-900/10' : ''}`}>
                      <td className="p-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-500 text-yellow-950' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-orange-700 text-orange-100' : 'bg-slate-800 text-slate-400'}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="p-4 font-semibold flex items-center gap-2">
                        {p.name} {p.id === myParticipantId && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">YOU</span>}
                      </td>
                      <td className="p-4 text-center">
                        {p.cupPick ? <img src={getLogo(p.cupPick)} alt={p.cupPick} className="w-8 h-8 object-contain mx-auto"/> : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-blue-400 text-lg">
                        {p.calculatedPoints}
                      </td>
                      <td className="p-4 text-center">
                        {p.id !== myParticipantId && (
                           <button 
                             onClick={() => handleGenerateTrashTalk(p)}
                             className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                           >
                             Trash Talk
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Trash Talk Modals Overlay essentially (rendering inline for simplicity) */}
            {Object.keys(trashTalk).map(id => {
              if(!trashTalk[id].text && !trashTalk[id].loading) return null;
              return (
                <div key={id} className="p-4 bg-slate-800/50 border-t border-slate-800 text-sm">
                  <div className="flex items-start gap-2">
                    <HockeyIcon name="MessageSquare" className="text-orange-400 mt-1" />
                    <div className="flex-1">
                      <span className="font-bold text-orange-400">AI Trash Talk Generator</span>
                      <p className="text-slate-300 mt-1 italic">"{trashTalk[id].loading ? 'Cooking up a burn...' : trashTalk[id].text}"</p>
                    </div>
                    <button onClick={() => setTrashTalk(prev => { const n = {...prev}; delete n[id]; return n; })} className="text-slate-500 hover:text-white">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-120px)] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-slate-950 p-3 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><HockeyIcon name="Users"/> Pool Banter</h3>
              <button onClick={toggleNotifications} className="text-slate-400 hover:text-white transition-colors" title="Toggle Notifications">
                <HockeyIcon name={notificationsEnabled ? 'Bell' : 'BellOff'} className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
              {chatMessages.length === 0 && <div className="text-center text-slate-500 mt-10">Be the first to talk some trash!</div>}
              {chatMessages.map((msg) => {
                const isMe = msg.uid === user?.uid;
                return (
                  <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                    <span className="text-[10px] text-slate-500 mb-1 px-1">{msg.senderName}</span>
                    <div className={`p-3 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}>
                      {renderMessageText(msg.text)}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800">
              {showGifs && (
                <div className="flex gap-2 p-2 mb-2 overflow-x-auto bg-slate-900 rounded-xl border border-slate-800">
                  {MOCK_GIFS.map((gif, i) => (
                    <img key={i} src={gif} alt="gif" className="h-16 rounded cursor-pointer hover:opacity-80" onClick={() => {
                      setNewMessage(gif);
                      setShowGifs(false);
                    }}/>
                  ))}
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <button type="button" onClick={() => setShowGifs(!showGifs)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl transition-colors shrink-0">
                  GIF
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Talk some smack..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors shrink-0">
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- ADMIN TAB --- */}
        {activeTab === 'admin' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {!isAdmin ? (
              <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center max-w-sm mx-auto mt-10">
                <HockeyIcon name="Settings" className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="font-bold text-xl mb-4">Admin Access</h3>
                <input 
                  type="password" 
                  value={adminPasswordInput}
                  onChange={e => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-center mb-4 focus:border-blue-500 outline-none"
                />
                <button 
                  onClick={() => { if(adminPasswordInput === 'admin') setIsAdmin(true); else alert('Incorrect'); }}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
                >
                  Unlock Admin
                </button>
                <p className="text-xs text-slate-500 mt-4">(Hint: type 'admin')</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl flex items-start gap-3 text-yellow-500">
                  <HockeyIcon name="AlertCircle" className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Admin Panel</h4>
                    <p className="text-sm text-yellow-600/80">Any changes here instantly affect everyone's leaderboards and live status.</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <h3 className="font-bold text-lg mb-4 text-blue-400">Manage Official Results (Calculates Points)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_MATCHUP_IDS.map(mid => {
                      const res = officialResults[mid] || { winner: '', topGoalScorer: '', topPointScorer: '' };
                      return (
                        <div key={mid} className="bg-slate-950 p-4 border border-slate-800 rounded-xl">
                          <h4 className="font-bold text-slate-300 mb-2">Matchup {mid}</h4>
                          <div className="space-y-2">
                            <input type="text" placeholder="Winner (Abbrev)" value={res.winner} onChange={e => handleUpdateOfficialResult(mid, 'winner', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"/>
                            <input type="text" placeholder="Top Goal Scorer" value={res.topGoalScorer} onChange={e => handleUpdateOfficialResult(mid, 'topGoalScorer', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"/>
                            <input type="text" placeholder="Top Point Scorer" value={res.topPointScorer} onChange={e => handleUpdateOfficialResult(mid, 'topPointScorer', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <h3 className="font-bold text-lg mb-4 text-red-400">Manage Live Matchup Teams (Rounds 2-4)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {ALL_MATCHUP_IDS.map(mid => {
                      if(mid.startsWith('E') && mid.length === 2) return null; // Skip R1
                      if(mid.startsWith('W') && mid.length === 2) return null; // Skip R1
                      const m = liveMatchups[mid] || { t1: '', t2: '' };
                      return (
                        <div key={mid} className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex gap-2">
                          <span className="font-bold text-slate-500 w-10 shrink-0">{mid}</span>
                          <input type="text" placeholder="Team 1" value={m.t1} onChange={e => handleUpdateLiveMatchup(mid, 't1', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm uppercase"/>
                          <input type="text" placeholder="Team 2" value={m.t2} onChange={e => handleUpdateLiveMatchup(mid, 't2', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm uppercase"/>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="flex justify-end">
                   <button onClick={() => setIsAdmin(false)} className="px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition-colors">Lock Admin Console</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
