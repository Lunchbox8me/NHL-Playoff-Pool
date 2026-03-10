import React, { useState, useEffect, Fragment } from 'react';
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

// --- INJECT TAILWIND CSS FOR CODESANDBOX ---
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

/** * Logic to ensure Firebase is initialized only once */
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
  if (name === 'Settings') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  if (name === 'Plus') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
  if (name === 'Trash2') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
  if (name === 'Loader2') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
  if (name === 'LogIn') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>;
  if (name === 'Share2') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
  if (name === 'Sparkles') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
  if (name === 'MessageSquare') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mergedClassName}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  
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

// --- GEMINI API PROMPT HANDLER ---
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

// --- Static Data ---
const TEAMS = ["NYR", "WSH", "CAR", "NYI", "FLA", "TBL", "BOS", "TOR", "DAL", "VGK", "WPG", "COL", "VAN", "NSH", "EDM", "LAK"];
const getLogo = (abbrev) => `https://assets.nhle.com/logos/nhl/svg/${abbrev}_light.svg`;

const MOCK_MATCHUPS = [
  { id: 'E1', t1: 'NYR', t2: 'WSH', region: 'East' },
  { id: 'E2', t1: 'FLA', t2: 'TBL', region: 'East' },
  { id: 'E3', t1: 'CAR', t2: 'NYI', region: 'East' },
  { id: 'E4', t1: 'BOS', t2: 'TOR', region: 'East' },
  { id: 'W1', t1: 'DAL', t2: 'VGK', region: 'West' },
  { id: 'W2', t1: 'VAN', t2: 'NSH', region: 'West' },
  { id: 'W3', t1: 'WPG', t2: 'COL', region: 'West' },
  { id: 'W4', t1: 'EDM', t2: 'LAK', region: 'West' },
];

const DEFAULT_PICKS = MOCK_MATCHUPS.reduce((acc, m) => {
  acc[m.id] = { winner: '', topGoalScorer: '', topPointScorer: '' };
  return acc;
}, {});

const TEAM_ROSTERS = {
  "NYR": [{ name: "A. Panarin", pos: "LW" }, { name: "M. Zibanejad", pos: "C" }, { name: "C. Kreider", pos: "LW" }, { name: "A. Fox", pos: "D" }],
  "WSH": [{ name: "A. Ovechkin", pos: "LW" }, { name: "D. Strome", pos: "C" }, { name: "J. Carlson", pos: "D" }, { name: "T. Wilson", pos: "RW" }],
  "CAR": [{ name: "S. Aho", pos: "C" }, { name: "A. Svechnikov", pos: "RW" }, { name: "J. Guentzel", pos: "LW" }, { name: "S. Jarvis", pos: "C" }],
  "NYI": [{ name: "M. Barzal", pos: "C" }, { name: "B. Horvat", pos: "C" }, { name: "B. Nelson", pos: "C" }, { name: "N. Dobson", pos: "D" }],
  "FLA": [{ name: "A. Barkov", pos: "C" }, { name: "M. Tkachuk", pos: "RW" }, { name: "S. Reinhart", pos: "C" }, { name: "C. Verhaeghe", pos: "C" }],
  "TBL": [{ name: "N. Kucherov", pos: "RW" }, { name: "B. Point", pos: "C" }, { name: "S. Stamkos", pos: "C" }, { name: "V. Hedman", pos: "D" }],
  "BOS": [{ name: "D. Pastrnak", pos: "RW" }, { name: "B. Marchand", pos: "LW" }, { name: "C. McAvoy", pos: "D" }, { name: "C. Coyle", pos: "C" }],
  "TOR": [{ name: "A. Matthews", pos: "C" }, { name: "M. Marner", pos: "RW" }, { name: "W. Nylander", pos: "RW" }, { name: "J. Tavares", pos: "C" }],
  "DAL": [{ name: "J. Robertson", pos: "LW" }, { name: "R. Hintz", pos: "C" }, { name: "M. Heiskanen", pos: "D" }, { name: "J. Pavelski", pos: "C" }],
  "VGK": [{ name: "J. Eichel", pos: "C" }, { name: "J. Marchessault", pos: "RW" }, { name: "M. Stone", pos: "RW" }, { name: "S. Theodore", pos: "D" }],
  "WPG": [{ name: "M. Scheifele", pos: "C" }, { name: "K. Connor", pos: "LW" }, { name: "J. Morrissey", pos: "D" }, { name: "N. Ehlers", pos: "LW" }],
  "COL": [{ name: "N. MacKinnon", pos: "C" }, { name: "M. Rantanen", pos: "RW" }, { name: "C. Makar", pos: "D" }, { name: "V. Nichushkin", pos: "RW" }],
  "VAN": [{ name: "E. Pettersson", pos: "C" }, { name: "J. Miller", pos: "C" }, { name: "Q. Hughes", pos: "D" }, { name: "B. Boeser", pos: "RW" }],
  "NSH": [{ name: "F. Forsberg", pos: "LW" }, { name: "R. Josi", pos: "D" }, { name: "R. O'Reilly", pos: "C" }, { name: "G. Nyquist", pos: "LW" }],
  "EDM": [{ name: "C. McDavid", pos: "C" }, { name: "L. Draisaitl", pos: "C" }, { name: "Z. Hyman", pos: "LW" }, { name: "E. Bouchard", pos: "D" }],
  "LAK": [{ name: "A. Kopitar", pos: "C" }, { name: "K. Fiala", pos: "LW" }, { name: "A. Kempe", pos: "RW" }, { name: "D. Doughty", pos: "D" }],
};

const MOCK_GAMES = [
  { id: 1, gameState: "LIVE", clock: { timeRemaining: "12:34", period: 2 }, awayTeam: { abbrev: "NYR", score: 2 }, homeTeam: { abbrev: "WSH", score: 1 } },
  { id: 2, gameState: "FINAL", clock: { timeRemaining: "00:00", period: 3 }, awayTeam: { abbrev: "TOR", score: 4 }, homeTeam: { abbrev: "BOS", score: 3 } }
];

// --- Main App Component ---
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [picksLoaded, setPicksLoaded] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [myPicks, setMyPicks] = useState({ cupWinner: '', series: DEFAULT_PICKS });
  const [liveGames, setLiveGames] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [trashTalk, setTrashTalk] = useState({});

  const sortedParticipants = [...participants].sort((a, b) => (b.points || 0) - (a.points || 0));

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

  useEffect(() => {
    if (!user || !isConfigured) return;
    const colRef = collection(poolDb, 'artifacts', poolId, 'public', 'data', 'participants');
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const parts = [];
      let me = null;
      snap.forEach(d => {
        const data = d.data();
        parts.push({ id: d.id, ...data });
        if (d.id === user.uid) me = { id: d.id, ...data };
      });
      setParticipants(parts);
      setLoadingData(false);
      if (me) {
        setHasJoined(true);
        if (!picksLoaded) {
          setMyPicks({ cupWinner: me.cupPick || '', series: me.picks || DEFAULT_PICKS });
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

  useEffect(() => {
    let isMounted = true;
    const fetchNHLData = async () => {
      try {
        const res = await fetch('https://api-web.nhle.com/v1/score/now');
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        if (isMounted) {
          let games = data.games || [];
          if (games.length === 0 && data.gameWeek) {
            const today = data.gameWeek.find(d => d.date === data.currentDate);
            if (today) games = today.games;
          }
          setLiveGames(games.length > 0 ? games : MOCK_GAMES);
        }
      } catch (err) {
        if (isMounted) { setLiveGames(MOCK_GAMES); }
      }
    };
    fetchNHLData();
    const interval = setInterval(fetchNHLData, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const handleSeriesPick = (id, field, value) => {
    setMyPicks(prev => ({ ...prev, series: { ...prev.series, [id]: { ...prev.series[id], [field]: value } } }));
  };

  const handleSavePicks = async () => {
    if (!user || !hasJoined) return;
    try {
      await updateDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', user.uid), {
        cupPick: myPicks.cupWinner, picks: myPicks.series
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) { console.error(err); }
  };

  const handleJoinPool = async (e) => {
    e.preventDefault();
    if (!newParticipantName.trim() || !user) return;
    try {
      await setDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', user.uid), {
        name: newParticipantName.trim(), points: 0, cupPick: "", r1Correct: 0,
        avatar: newParticipantName.substring(0, 2).toUpperCase(), picks: DEFAULT_PICKS
      });
      setNewParticipantName('');
    } catch (err) { console.error(err); }
  };

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) return;
    try {
      const offlineId = crypto.randomUUID();
      await setDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', offlineId), {
        name: newParticipantName.trim() + " (Offline)", points: 0, cupPick: "", r1Correct: 0,
        avatar: newParticipantName.substring(0, 2).toUpperCase(), picks: DEFAULT_PICKS
      });
      setNewParticipantName('');
    } catch (err) { console.error(err); }
  };

  const handleUpdateParticipant = async (id, field, value) => {
    try {
      const val = (field === 'points' || field === 'r1Correct') ? Number(value) : value;
      await updateDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', id), { [field]: val });
    } catch (err) { console.error(err); }
  };

  const handleRemoveParticipant = async (id) => {
    if(window.confirm("Remove participant?")) {
      try { await deleteDoc(doc(poolDb, 'artifacts', poolId, 'public', 'data', 'participants', id)); } catch (err) { console.error(err); }
    }
  };

  const handleCopyLink = () => {
    let shareUrl = window.location.href;
    try { if (window.self !== window.top) shareUrl = document.referrer || window.location.href; } catch (e) { shareUrl = document.referrer || window.location.href; }
    const el = document.createElement('textarea');
    el.value = shareUrl;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleGenerateAnalysis = async (seriesId, t1, t2) => {
    setAiAnalysis(prev => ({ ...prev, [seriesId]: { loading: true, text: '' } }));
    const t1Roster = TEAM_ROSTERS[t1]?.map(p => p.name).join(', ') || 'stars';
    const t2Roster = TEAM_ROSTERS[t2]?.map(p => p.name).join(', ') || 'stars';
    const text = await callGemini(`Analyze NHL series: ${t1} vs ${t2}. Mention ${t1Roster} and ${t2Roster}. Max 3 sentences, end with a prediction.`);
    setAiAnalysis(prev => ({ ...prev, [seriesId]: { loading: false, text } }));
  };

  const handleGenerateTrashTalk = async (opponent) => {
    if (!user) return;
    setTrashTalk(prev => ({ ...prev, [opponent.id]: { loading: true, text: '' } }));
    const myInfo = sortedParticipants.find(p => p.id === user.uid);
    const text = await callGemini(`Write PG trash talk to ${opponent.name} (${opponent.points} pts, picked ${opponent.cupPick}). I have ${myInfo?.points || 0} pts. Max 2 sentences, no emojis.`);
    setTrashTalk(prev => ({ ...prev, [opponent.id]: { loading: false, text } }));
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-300">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-2xl w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
             <HockeyIcon name="AlertCircle" className="text-amber-500"/> Firebase Setup Required
          </h2>
          <p className="mb-4 text-sm text-slate-400">Exported apps require manual database keys. Follow these steps:</p>
          <ol className="list-decimal ml-5 space-y-2 text-sm text-slate-300">
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-400">Firebase Console</a></li>
            <li>Enable <strong>Anonymous Auth</strong> and <strong>Firestore</strong> (Test Mode)</li>
            <li>Paste your copied keys directly into the <code>FIREBASE_KEYS</code> object at the <strong>very top</strong> of the <code>App.jsx</code> file!</li>
          </ol>
        </div>
      </div>
    );
  }

  if (loadingAuth || (user && loadingData)) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 flex-col gap-4 font-bold">
      <HockeyIcon name="Loader2" className="animate-spin w-12 h-12" /> Loading IcePool '26...
    </div>
  );

  if (user && !hasJoined) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
          <HockeyIcon name="Goal" className="text-white w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to IcePool '26</h2>
        <form onSubmit={handleJoinPool} className="flex flex-col gap-4 mt-6">
          <input type="text" placeholder="Display Name" value={newParticipantName} onChange={(e) => setNewParticipantName(e.target.value)} className="bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-center outline-none focus:border-blue-500"/>
          <button type="submit" className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"><HockeyIcon name="LogIn" /> Join Pool</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans">
      <nav className="fixed md:sticky bottom-0 md:top-0 w-full md:w-64 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 z-50 h-16 md:h-screen flex flex-row md:flex-col p-2 md:p-6 justify-around md:justify-start">
        <div className="hidden md:flex items-center gap-3 mb-10"><HockeyIcon name="Goal" className="text-blue-500" /><h1 className="text-xl font-bold tracking-tight">IcePool '26</h1></div>
        <div className="flex md:flex-col w-full gap-2">
          <NavItem id="dashboard" icon={<HockeyIcon name="LayoutDashboard"/>} label="Dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="mypicks" icon={<HockeyIcon name="Edit3"/>} label="My Picks" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="leaderboard" icon={<HockeyIcon name="Trophy"/>} label="Leaderboard" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="live" icon={<HockeyIcon name="Activity"/>} label="Live Action" activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="md:mt-auto hidden md:block border-t border-slate-800 pt-4" />
          <NavItem id="manage" icon={<HockeyIcon name="Settings"/>} label="Manage Pool" activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-24 max-w-6xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
              <h2 className="text-3xl font-bold">Dashboard</h2>
              <button onClick={handleCopyLink} className="flex items-center gap-2 bg-slate-800 px-4 py-2.5 rounded-lg font-bold border border-slate-700 hover:bg-slate-700 transition-colors">
                <HockeyIcon name={copySuccess ? "CheckCircle2" : "Share2"} className={copySuccess ? 'text-green-400' : ''}/> {copySuccess ? 'Link Copied!' : 'Invite Friends'}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><HockeyIcon name="Activity" className="text-red-500" /> Live Scores</h3>
                <div className="grid grid-cols-1 gap-4">
                  {liveGames.slice(0, 4).map(game => (
                    <div key={game.id || Math.random()} className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-sm">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest"><span>{game.gameState}</span><span>{game.clock?.timeRemaining} {game.clock?.period ? `P${game.clock.period}` : ''}</span></div>
                      <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><img src={getLogo(game.awayTeam.abbrev)} className="w-6 h-6 shadow-sm" alt=""/> <span className="font-bold text-slate-200">{game.awayTeam.abbrev}</span></div><span className="font-black text-xl">{game.awayTeam.score ?? '-'}</span></div>
                      <div className="flex justify-between items-center"><div className="flex items-center gap-2"><img src={getLogo(game.homeTeam.abbrev)} className="w-6 h-6 shadow-sm" alt=""/> <span className="font-bold text-slate-200">{game.homeTeam.abbrev}</span></div><span className="font-black text-xl">{game.homeTeam.score ?? '-'}</span></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><HockeyIcon name="Trophy" className="text-yellow-500" /> Standings</h3>
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse"><tbody className="divide-y divide-slate-700">
                    {sortedParticipants.slice(0, 5).map((u, i) => (
                      <tr key={u.id} className="text-sm hover:bg-slate-700/30 transition-colors"><td className="p-4 w-10 text-center font-bold text-slate-500">{i+1}</td><td className="p-4 font-bold">{u.name}</td><td className="p-4 text-right font-black text-white">{u.points || 0}</td></tr>
                    ))}
                  </tbody></table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mypicks' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-end">
              <h2 className="text-3xl font-bold">My Picks</h2>
              <button onClick={handleSavePicks} className="bg-blue-600 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-600/20">{saveSuccess ? <HockeyIcon name="CheckCircle2"/> : 'Save Picks'}</button>
            </div>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl">
              <h3 className="font-bold mb-4 text-slate-300">Stanley Cup Winner Prediction</h3>
              <select value={myPicks.cupWinner} onChange={(e) => setMyPicks({...myPicks, cupWinner: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg outline-none focus:border-blue-500 transition-colors">
                <option value="">Select Champion...</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_MATCHUPS.map(m => {
                const roster = [...(TEAM_ROSTERS[m.t1] || []), ...(TEAM_ROSTERS[m.t2] || [])];
                return (
                <div key={m.id} className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{m.region} Conference</span><button onClick={() => handleGenerateAnalysis(m.id, m.t1, m.t2)} className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded hover:bg-amber-500/20 transition-colors">✨ Analyze</button></div>
                  {aiAnalysis[m.id]?.text && <div className="mb-4 text-xs text-amber-100/80 italic bg-amber-950/20 p-3 rounded border border-amber-900/30 leading-relaxed shadow-inner">{aiAnalysis[m.id].text}</div>}
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => handleSeriesPick(m.id, 'winner', m.t1)} className={`flex-1 p-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${myPicks.series[m.id].winner === m.t1 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}><img src={getLogo(m.t1)} className="w-5 h-5 shadow-sm" alt=""/> {m.t1}</button>
                    <button onClick={() => handleSeriesPick(m.id, 'winner', m.t2)} className={`flex-1 p-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${myPicks.series[m.id].winner === m.t2 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}><img src={getLogo(m.t2)} className="w-5 h-5 shadow-sm" alt=""/> {m.t2}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Goal Scorer</label>
                      <select value={myPicks.series[m.id].topGoalScorer} onChange={(e) => handleSeriesPick(m.id, 'topGoalScorer', e.target.value)} className="w-full bg-slate-950 p-2 rounded text-[11px] outline-none border border-slate-800 focus:border-blue-500 transition-colors">
                        <option value="">Pick Player</option>
                        {roster.map(p => <option key={`goal-${p.name}`} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Points Scorer</label>
                      <select value={myPicks.series[m.id].topPointScorer} onChange={(e) => handleSeriesPick(m.id, 'topPointScorer', e.target.value)} className="w-full bg-slate-950 p-2 rounded text-[11px] outline-none border border-slate-800 focus:border-blue-500 transition-colors">
                        <option value="">Pick Player</option>
                        {roster.map(p => <option key={`pts-${p.name}`} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-3xl font-bold">Leaderboard</h2>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-700">
                  <tr><th className="p-4 w-12 text-center font-black">Rk</th><th className="p-4 font-black">Participant</th><th className="p-4 font-black">Cup Pick</th><th className="p-4 text-right font-black">Points</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {sortedParticipants.map((u, i) => (
                    <Fragment key={u.id}>
                      <tr className="hover:bg-slate-700/20 transition-colors group">
                        <td className="p-4 text-center font-bold text-slate-500">{i+1}</td>
                        <td className="p-4 font-bold text-slate-200">{u.name}</td>
                        <td className="p-4 text-sm text-slate-400"><div className="flex items-center gap-2">{u.cupPick && <img src={getLogo(u.cupPick)} className="w-5 h-5 shadow-sm" alt=""/>} {u.cupPick || '-'}</div></td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-black text-xl text-white tracking-tighter">{u.points || 0}</span>
                            {u.id !== user?.uid && <button onClick={() => handleGenerateTrashTalk(u)} className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded hover:bg-blue-500/20 transition-all active:scale-95 opacity-0 group-hover:opacity-100 focus:opacity-100">✨ CHIRP</button>}
                          </div>
                        </td>
                      </tr>
                      {trashTalk[u.id]?.text && <tr className="bg-blue-900/10 text-xs italic text-blue-200"><td colSpan="4" className="p-3 px-12 border-l-4 border-blue-500 shadow-inner">"{trashTalk[u.id].text}"</td></tr>}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-3xl font-bold">Manage Pool</h2>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-200"><HockeyIcon name="Users" className="text-blue-400"/> Add Participant (Manual Entry)</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter name..." value={newParticipantName} onChange={(e) => setNewParticipantName(e.target.value)} className="bg-slate-950 flex-1 p-3 rounded-lg outline-none border border-slate-800 focus:border-blue-500 transition-colors text-white"/>
                <button onClick={handleAddParticipant} className="bg-blue-600 px-6 font-bold rounded-lg hover:bg-blue-500 transition-colors active:scale-95 shadow-lg">Add</button>
              </div>
            </div>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-x-auto shadow-xl">
              <table className="w-full text-left min-w-[600px] border-collapse"><tbody className="divide-y divide-slate-700">
                {participants.map(p => (
                  <tr key={p.id} className="hover:bg-slate-700/20 transition-colors"><td className="p-4 font-bold text-slate-200">{p.name}</td><td className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-tight">Pts: <input type="number" value={p.points} onChange={(e) => handleUpdateParticipant(p.id, 'points', e.target.value)} className="bg-slate-950 p-2 rounded w-20 text-center border border-slate-800 text-slate-100 font-black focus:border-blue-500 outline-none"/></div></td><td className="p-4 text-right"><button onClick={() => handleRemoveParticipant(p.id)} className="text-slate-500 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-500/10"><HockeyIcon name="Trash2"/></button></td></tr>
                ))}
                {participants.length === 0 && (
                  <tr><td colSpan="3" className="p-12 text-center text-slate-500 italic font-medium">No participants found in database. Share your link to start!</td></tr>
                )}
              </tbody></table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
