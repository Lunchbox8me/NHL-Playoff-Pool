import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HockeyIcon } from '../components/icons/HockeyIcon';
import { NavItem } from '../components/navigation/NavItem';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { BracketView } from '../components/bracket/BracketView';
import { StatsView } from '../components/stats/StatsView';
import { Toast } from '../components/ui/Toast';
import { ProfileCustomization } from '../components/profile/ProfileCustomization';
import { 
  TEAMS, 
  DEFAULT_PICKS, 
  TEAM_ROSTERS, 
  MOCK_GIFS,
  ROUND_MATCHUPS_STRUCTURE,
  POINT_VALUES,
  CUP_WINNER_BONUS,
  getLogo,
  calculateParticipantScore
} from '../components/utils/constants';

export default function IcePool() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState(null);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [myPicks, setMyPicks] = useState({ cupWinner: '', series: DEFAULT_PICKS });
  const [liveGames, setLiveGames] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [trashTalk, setTrashTalk] = useState({});
  
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGifs, setShowGifs] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  
  const [liveMatchups, setLiveMatchups] = useState({});
  const [officialResults, setOfficialResults] = useState({});
  const [toasts, setToasts] = useState([]);
  const [showProfileCustomization, setShowProfileCustomization] = useState(false);
  const [picksDeadline, setPicksDeadline] = useState(null);
  const [picksLocked, setPicksLocked] = useState(false);
  const [teamRosters, setTeamRosters] = useState({});

  const chatEndRef = useRef(null);
  const prevMessagesLength = useRef(0);
  const queryClient = useQueryClient();

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        console.error('Not authenticated');
      } finally {
        setLoadingAuth(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch participants
  const { data: participants = [], isLoading: loadingParticipants } = useQuery({
    queryKey: ['participants'],
    queryFn: () => base44.entities.Participant.list(),
    enabled: !!user,
  });

  // Fetch chat messages
  const { data: rawChatMessages = [] } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-timestamp'),
    enabled: !!user && hasJoined,
  });

  useEffect(() => {
    setChatMessages(rawChatMessages);
  }, [rawChatMessages]);

  // Fetch settings
  const { data: settingsData = [] } = useQuery({
    queryKey: ['poolSettings'],
    queryFn: () => base44.entities.PoolSettings.list(),
    enabled: !!user,
  });

  // Fetch pool config
  const { data: poolConfigs = [] } = useQuery({
    queryKey: ['poolConfig'],
    queryFn: () => base44.entities.PoolConfig.list(),
    enabled: !!user,
  });

  // Fetch activities
  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-timestamp', 50),
    enabled: !!user && hasJoined,
  });

  useEffect(() => {
    const matchupsSettings = settingsData.find(s => s.settingType === 'matchups');
    const resultsSettings = settingsData.find(s => s.settingType === 'results');
    if (matchupsSettings) setLiveMatchups(matchupsSettings.data || {});
    if (resultsSettings) setOfficialResults(resultsSettings.data || {});
  }, [settingsData]);

  useEffect(() => {
    if (poolConfigs.length > 0) {
      const config = poolConfigs[0];
      if (config.picksDeadline) {
        setPicksDeadline(new Date(config.picksDeadline));
        setPicksLocked(new Date() > new Date(config.picksDeadline));
      }
    }
  }, [poolConfigs]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubParticipants = base44.entities.Participant.subscribe(() => {
      queryClient.invalidateQueries(['participants']);
    });

    const unsubChat = base44.entities.ChatMessage.subscribe(() => {
      queryClient.invalidateQueries(['chatMessages']);
    });

    const unsubSettings = base44.entities.PoolSettings.subscribe(() => {
      queryClient.invalidateQueries(['poolSettings']);
    });

    return () => {
      unsubParticipants();
      unsubChat();
      unsubSettings();
    };
  }, [user, queryClient]);

  // Check if user has joined
  useEffect(() => {
    if (!user || !participants.length) return;
    const me = participants.find(p => p.created_by === user.email || p.uids?.includes(user.id));
    if (me) {
      setHasJoined(true);
      setMyParticipantId(me.id);
      const mergedSeries = { ...DEFAULT_PICKS, ...(me.picks || {}) };
      setMyPicks({ cupWinner: me.cupPick || '', series: mergedSeries });
    } else {
      setHasJoined(false);
    }
  }, [user, participants]);

  // Fetch NHL live games and playoff matchups
  useEffect(() => {
    let isMounted = true;
    const fetchNHLData = async () => {
      try {
        const res = await fetch('https://api-web.nhle.com/v1/score/now');
        const data = await res.json();
        if (isMounted) setLiveGames(data.games || []);
      } catch (err) {
        if (isMounted) setLiveGames([]);
      }
    };

    const fetchPlayoffMatchups = async () => {
      try {
        const res = await fetch('https://api-web.nhle.com/v1/playoff-series/carousel/20252026');
        const data = await res.json();
        if (!isMounted || !data.rounds) return;

        // Auto-populate matchups from NHL API
        const newMatchups = {};
        data.rounds.forEach((round, idx) => {
          round.series?.forEach((series) => {
            const topSeed = series.topSeed?.abbrev;
            const bottomSeed = series.bottomSeed?.abbrev;
            if (topSeed && bottomSeed) {
              // Map to our matchup IDs (E1, E2, W1, W2, etc.)
              const isEast = series.seriesAbbrev?.startsWith('E');
              const seriesNum = series.seriesAbbrev?.match(/\d+/)?.[0];
              if (isEast && seriesNum) {
                newMatchups[`E${seriesNum}`] = { t1: topSeed, t2: bottomSeed };
              } else if (seriesNum) {
                newMatchups[`W${seriesNum}`] = { t1: topSeed, t2: bottomSeed };
              }
            }
          });
        });

        // Update only if we found matchups
        if (Object.keys(newMatchups).length > 0 && isAdmin) {
          await updateSettingsMutation.mutateAsync({ settingType: 'matchups', data: newMatchups });
        }
      } catch (err) {
        console.log('Playoff data not available yet');
      }
    };

    fetchNHLData();
    fetchPlayoffMatchups();
    const interval = setInterval(() => {
      fetchNHLData();
      fetchPlayoffMatchups();
    }, 300000); // Check every 5 minutes
    return () => { isMounted = false; clearInterval(interval); };
  }, [isAdmin]);

  // Track previous scores for notifications
  const prevScoresRef = useRef({});

  // Processed participants with calculated scores
  const processedParticipants = useMemo(() => {
    return participants.map(p => {
      const scoreData = calculateParticipantScore(p.picks, officialResults, p.cupPick);
      return {
        ...p,
        calculatedPoints: scoreData.total,
        pointsBreakdown: scoreData.breakdown
      };
    }).sort((a, b) => b.calculatedPoints - a.calculatedPoints);
  }, [participants, officialResults]);

  // Notify user when their picks score points
  useEffect(() => {
    if (!myParticipantId || !hasJoined) return;
    
    const myData = processedParticipants.find(p => p.id === myParticipantId);
    if (!myData) return;

    const prevScore = prevScoresRef.current[myParticipantId];
    const currentScore = myData.calculatedPoints;

    // Only notify if score increased and we have a previous score
    if (prevScore !== undefined && currentScore > prevScore) {
      const pointsGained = currentScore - prevScore;
      addToast(`🎉 You earned ${pointsGained} points!`, 'success');
    }

    // Update reference
    prevScoresRef.current[myParticipantId] = currentScore;
  }, [processedParticipants, myParticipantId, hasJoined]);

  // Mutations
  const createParticipantMutation = useMutation({
    mutationFn: (data) => base44.entities.Participant.create(data),
    onSuccess: () => queryClient.invalidateQueries(['participants']),
  });

  const updateParticipantMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Participant.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['participants']),
  });

  const createChatMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => queryClient.invalidateQueries(['chatMessages']),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ settingType, data }) => {
      const existing = settingsData.find(s => s.settingType === settingType);
      if (existing) {
        return base44.entities.PoolSettings.update(existing.id, { data });
      } else {
        return base44.entities.PoolSettings.create({ settingType, data });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['poolSettings']),
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => queryClient.invalidateQueries(['activities']),
  });

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSeriesPick = (matchupId, field, value) => {
    setMyPicks(prev => {
      const currentItem = prev.series[matchupId] || { winner: '', topGoalScorer: '', topPointScorer: '' };
      const updatedSeries = { ...prev.series, [matchupId]: { ...currentItem, [field]: value } };
      return { ...prev, series: updatedSeries };
    });
  };

  const handleSavePicks = async () => {
    if (!user || !hasJoined || !myParticipantId) return;
    if (picksLocked) {
      addToast('Picks are locked! Deadline has passed.', 'error');
      return;
    }

    const me = participants.find(p => p.id === myParticipantId);
    
    try {
      await updateParticipantMutation.mutateAsync({
        id: myParticipantId,
        data: { 
          cupPick: myPicks.cupWinner, 
          picks: myPicks.series,
          lastPickUpdate: new Date().toISOString(),
          previousPicks: me?.picks || {}
        }
      });

      await createActivityMutation.mutateAsync({
        activityType: 'pick_updated',
        participantName: me?.name || 'Someone',
        description: 'updated their picks',
        timestamp: Date.now()
      });

      setSaveSuccess(true);
      addToast('Picks saved successfully!', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      addToast('Failed to save picks', 'error');
    }
  };

  const handleUndoPicks = async () => {
    if (!myParticipantId) return;
    const me = participants.find(p => p.id === myParticipantId);
    if (!me?.previousPicks) {
      addToast('No previous picks to restore', 'info');
      return;
    }

    try {
      await updateParticipantMutation.mutateAsync({
        id: myParticipantId,
        data: { picks: me.previousPicks }
      });
      setMyPicks(prev => ({ ...prev, series: me.previousPicks }));
      addToast('Picks restored!', 'success');
    } catch (err) {
      addToast('Failed to restore picks', 'error');
    }
  };

  const handleJoinPool = async (e) => {
    e.preventDefault();
    const name = newParticipantName.trim();
    if (!name || !user) return;
    
    const existingUser = participants.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingUser) {
      const currentUids = existingUser.uids || [];
      if (!currentUids.includes(user.id)) {
        await updateParticipantMutation.mutateAsync({
          id: existingUser.id,
          data: { uids: [...currentUids, user.id] }
        });
      }
      setNewParticipantName('');
      return;
    }
    
    await createParticipantMutation.mutateAsync({
      name,
      avatar: name.substring(0, 2).toUpperCase(),
      cupPick: "",
      picks: DEFAULT_PICKS,
      uids: [user.id]
    });

    await createActivityMutation.mutateAsync({
      activityType: 'participant_joined',
      participantName: name,
      description: 'joined the pool',
      timestamp: Date.now()
    });

    setNewParticipantName('');
    addToast(`Welcome to the pool, ${name}!`, 'success');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !myParticipantId) return;
    const myName = participants.find(p => p.id === myParticipantId)?.name || 'Anonymous';
    const msgText = newMessage.trim();
    setNewMessage('');
    setShowGifs(false);
    
    try {
      await createChatMessageMutation.mutateAsync({
        text: msgText,
        senderName: myName,
        timestamp: Date.now()
      });

      await createActivityMutation.mutateAsync({
        activityType: 'chat_message',
        participantName: myName,
        description: msgText.length > 50 ? 'sent a message' : `said: "${msgText}"`,
        timestamp: Date.now()
      });
    } catch (err) {
      addToast('Failed to send message', 'error');
    }
  };

  const handleExportData = () => {
    const csvData = processedParticipants.map((p, idx) => ({
      Rank: idx + 1,
      Name: p.name,
      'Cup Pick': p.cupPick || '-',
      Points: p.calculatedPoints,
      'Series Winners': p.pointsBreakdown?.seriesWinners || 0,
      'Goal Scorers': p.pointsBreakdown?.goalScorers || 0,
      'Point Leaders': p.pointsBreakdown?.pointLeaders || 0,
      'Cup Bonus': p.pointsBreakdown?.cupBonus || 0
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icepool-standings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Standings exported!', 'success');
  };

  const handleUpdateProfile = async (updates) => {
    if (!myParticipantId) return;
    try {
      await updateParticipantMutation.mutateAsync({
        id: myParticipantId,
        data: updates
      });
      addToast('Profile updated!', 'success');
    } catch (err) {
      addToast('Failed to update profile', 'error');
    }
  };

  const renderMessageText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(/(https?:\/\/[^\s]+(\.gif|\.jpg|\.jpeg|\.png|\.webp))/i)) 
        return <img key={i} src={part} alt="" className="max-w-full rounded-lg mt-2 max-h-48 border border-slate-700/50 shadow-sm" />;
      if (part.match(urlRegex)) 
        return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-300 underline break-all">{part}</a>;
      return <span key={i} className="break-words">{part}</span>;
    });
  };

  const handleUpdateLiveMatchup = async (mid, side, team) => {
    const current = liveMatchups[mid] || { t1: '', t2: '' };
    const update = { ...liveMatchups, [mid]: { ...current, [side]: team } };
    setLiveMatchups(update);
    await updateSettingsMutation.mutateAsync({ settingType: 'matchups', data: update });
  };

  const handleUpdateOfficialResult = async (mid, field, value) => {
    const current = officialResults[mid] || { winner: '', topGoalScorer: '', topPointScorer: '' };
    const update = { ...officialResults, [mid]: { ...current, [field]: value } };
    setOfficialResults(update);
    await updateSettingsMutation.mutateAsync({ settingType: 'results', data: update });
  };

  const handleCopyLink = () => {
    const el = document.createElement('textarea');
    el.value = window.location.href;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleGenerateAnalysis = async (seriesId, t1, t2) => {
    if (!t1 || !t2) return;
    setAiAnalysis(prev => ({ ...prev, [seriesId]: { loading: true, text: '' } }));
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze NHL playoff series: ${t1} vs ${t2}. Provide a brief 3-sentence analysis ending with a prediction.`,
      });
      setAiAnalysis(prev => ({ ...prev, [seriesId]: { loading: false, text: result } }));
    } catch (err) {
      setAiAnalysis(prev => ({ ...prev, [seriesId]: { loading: false, text: 'Failed to generate analysis.' } }));
    }
  };

  const handleGenerateTrashTalk = async (opponent) => {
    if (!user) return;
    setTrashTalk(prev => ({ ...prev, [opponent.id]: { loading: true, text: '' } }));
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Write PG-rated trash talk to ${opponent.name} for a hockey pool. Max 2 sentences, no emojis.`,
      });
      setTrashTalk(prev => ({ ...prev, [opponent.id]: { loading: false, text: result } }));
    } catch (err) {
      setTrashTalk(prev => ({ ...prev, [opponent.id]: { loading: false, text: 'Failed to generate trash talk.' } }));
    }
  };

  // Fetch team rosters from NHL API
  const fetchTeamRoster = async (teamAbbrev) => {
    if (!teamAbbrev || teamRosters[teamAbbrev]) return teamRosters[teamAbbrev] || [];
    
    try {
      const res = await fetch(`https://api-web.nhle.com/v1/roster/${teamAbbrev}/current`);
      const data = await res.json();
      
      const forwards = (data.forwards || []).map(p => ({
        name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
        team: teamAbbrev,
        position: 'F'
      }));
      
      const defensemen = (data.defensemen || []).map(p => ({
        name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
        team: teamAbbrev,
        position: 'D'
      }));
      
      const roster = [...forwards, ...defensemen].filter(p => p.name && p.name.length > 1);
      setTeamRosters(prev => ({ ...prev, [teamAbbrev]: roster }));
      return roster;
    } catch (err) {
      console.log(`Failed to fetch ${teamAbbrev} roster, using fallback`);
      return TEAM_ROSTERS[teamAbbrev] || [];
    }
  };

  const getCombinedRoster = (t1, t2) => {
    const r1 = teamRosters[t1] || TEAM_ROSTERS[t1] || [];
    const r2 = teamRosters[t2] || TEAM_ROSTERS[t2] || [];
    return [...r1, ...r2].sort((a, b) => a.name.localeCompare(b.name));
  };

  // Fetch rosters when matchups are set
  useEffect(() => {
    Object.values(liveMatchups).forEach(matchup => {
      if (matchup.t1) fetchTeamRoster(matchup.t1);
      if (matchup.t2) fetchTeamRoster(matchup.t2);
    });
  }, [liveMatchups]);

  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (loadingAuth || (user && loadingParticipants)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 flex-col gap-4 font-bold">
        <HockeyIcon name="Loader2" className="animate-spin w-12 h-12" />
        Loading IcePool '26...
      </div>
    );
  }

  if (user && !hasJoined) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
            <HockeyIcon name="Goal" className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to IcePool '26</h2>
          <form onSubmit={handleJoinPool} className="flex flex-col gap-4 mt-6">
            <input 
              type="text" 
              placeholder="Display Name" 
              value={newParticipantName} 
              onChange={(e) => setNewParticipantName(e.target.value)} 
              className="bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-center outline-none focus:border-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold transition-transform active:scale-95">
              Join Pool
            </button>
            <p className="text-slate-400 text-xs italic mt-2">You can always change your display name later.</p>
          </form>
        </div>
      </div>
    );
  }

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
          <NavItem id="bracket" icon={<HockeyIcon name="Trophy" />} label="Bracket" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="standings" icon={<HockeyIcon name="Medal" />} label="Standings" activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="stats" icon={<HockeyIcon name="Activity" />} label="Stats" activeTab={activeTab} setActiveTab={setActiveTab} />
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
            <p className="text-slate-400 text-sm">
              Welcome back, 
              <button 
                onClick={() => setShowProfileCustomization(true)}
                className="text-blue-400 font-semibold hover:underline ml-1"
              >
                {participants.find(p => p.id === myParticipantId)?.name || 'Player'}
              </button>
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-slate-400 text-sm">Pts</span>
            <span className="text-xl font-bold text-white">{processedParticipants.find(p => p.id === myParticipantId)?.calculatedPoints || 0}</span>
          </div>
        </header>

        {/* Toasts */}
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}

        {/* Profile Customization Modal */}
        {showProfileCustomization && (
          <ProfileCustomization 
            participant={participants.find(p => p.id === myParticipantId)}
            onUpdate={handleUpdateProfile}
            onClose={() => setShowProfileCustomization(false)}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Picks Deadline Warning */}
            {picksDeadline && !picksLocked && (
              <div className="bg-orange-900/20 border border-orange-700/50 p-4 rounded-xl flex items-start gap-3">
                <HockeyIcon name="AlertCircle" className="text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-orange-400">Picks Deadline Approaching</h4>
                  <p className="text-sm text-orange-600/80 mt-1">
                    Make your picks before {picksDeadline.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Activity Feed */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <HockeyIcon name="Activity" className="text-green-400" />
                <h3 className="font-bold text-lg">Recent Activity</h3>
              </div>
              <ActivityFeed activities={activities} isLoading={loadingActivities} />
            </div>

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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          i === 0 ? 'bg-yellow-500 text-yellow-950' : i === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-700 text-orange-100'
                        }`}>
                          #{i + 1}
                        </div>
                        <span className="font-semibold">{p.name}</span>
                      </div>
                      <span className="font-mono text-blue-400">{p.calculatedPoints} pt</span>
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('standings')} className="w-full text-center text-sm text-blue-400 mt-4 hover:underline">
                    View Full Standings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mypicks' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 sticky top-0 md:top-4 z-40">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">
                  {picksLocked ? '🔒 Picks are locked' : 'Make your predictions. Don\'t forget to save!'}
                </span>
                {participants.find(p => p.id === myParticipantId)?.previousPicks && !picksLocked && (
                  <button 
                    onClick={handleUndoPicks}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Undo Last Save
                  </button>
                )}
              </div>
              <button 
                onClick={handleSavePicks} 
                disabled={picksLocked}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  picksLocked ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
                  saveSuccess ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {saveSuccess ? 'Saved!' : picksLocked ? 'Locked' : 'Save Picks'}
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
                                {combinedRoster.map(p => (
                                  <option key={p.name} value={p.name}>
                                    {p.name} ({p.position} - {p.team})
                                  </option>
                                ))}
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
                                {combinedRoster.map(p => (
                                  <option key={p.name} value={p.name}>
                                    {p.name} ({p.position} - {p.team})
                                  </option>
                                ))}
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

        {activeTab === 'bracket' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Playoff Bracket</h3>
              <div className="text-sm text-slate-400">
                <span className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700/50 px-3 py-1 rounded-lg">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Winner
                </span>
              </div>
            </div>
            <BracketView liveMatchups={liveMatchups} officialResults={officialResults} />
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="space-y-6">
            {/* Points System Info */}
            <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 p-6 rounded-2xl border border-blue-800/50">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <HockeyIcon name="Trophy" className="text-yellow-400" />
                Points System
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <h4 className="text-xs text-slate-400 uppercase font-semibold mb-2">Round 1</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-300">Series Winner:</span><span className="font-bold text-blue-400">{POINT_VALUES.r1.winner} pts</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Goal Leader:</span><span className="font-bold text-blue-400">{POINT_VALUES.r1.goal} pt</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Point Leader:</span><span className="font-bold text-blue-400">{POINT_VALUES.r1.points} pt</span></div>
                  </div>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <h4 className="text-xs text-slate-400 uppercase font-semibold mb-2">Round 2</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-300">Series Winner:</span><span className="font-bold text-green-400">{POINT_VALUES.r2.winner} pts</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Goal Leader:</span><span className="font-bold text-green-400">{POINT_VALUES.r2.goal} pts</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Point Leader:</span><span className="font-bold text-green-400">{POINT_VALUES.r2.points} pts</span></div>
                  </div>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <h4 className="text-xs text-slate-400 uppercase font-semibold mb-2">Round 3</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-300">Series Winner:</span><span className="font-bold text-purple-400">{POINT_VALUES.r3.winner} pts</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Goal Leader:</span><span className="font-bold text-purple-400">{POINT_VALUES.r3.goal} pts</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Point Leader:</span><span className="font-bold text-purple-400">{POINT_VALUES.r3.points} pts</span></div>
                  </div>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <h4 className="text-xs text-slate-400 uppercase font-semibold mb-2">Stanley Cup Final</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-300">Series Winner:</span><span className="font-bold text-yellow-400">{POINT_VALUES.r4.winner} pts</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Goal Leader:</span><span className="font-bold text-yellow-400">{POINT_VALUES.r4.goal} pts</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Point Leader:</span><span className="font-bold text-yellow-400">{POINT_VALUES.r4.points} pts</span></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HockeyIcon name="Sparkles" className="text-yellow-400" />
                    <span className="font-bold text-yellow-400">Cup Winner Bonus</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-400">{CUP_WINNER_BONUS} pts</span>
                </div>
                <p className="text-xs text-yellow-600/80 mt-2">Correctly predict the Stanley Cup champion from the beginning!</p>
              </div>
            </div>

            {/* Leaderboard */}
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            idx === 0 ? 'bg-yellow-500 text-yellow-950' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-orange-700 text-orange-100' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{p.name}</span>
                            {p.id === myParticipantId && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">YOU</span>}
                          </div>
                          {p.pointsBreakdown && (
                            <div className="flex gap-2 mt-1 text-[10px]">
                              {p.pointsBreakdown.seriesWinners > 0 && <span className="bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">W: {p.pointsBreakdown.seriesWinners}</span>}
                              {p.pointsBreakdown.goalScorers > 0 && <span className="bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded">G: {p.pointsBreakdown.goalScorers}</span>}
                              {p.pointsBreakdown.pointLeaders > 0 && <span className="bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">P: {p.pointsBreakdown.pointLeaders}</span>}
                              {p.pointsBreakdown.cupBonus > 0 && <span className="bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded">🏆 {p.pointsBreakdown.cupBonus}</span>}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {p.cupPick ? (
                            <div className="flex flex-col items-center">
                              <img src={getLogo(p.cupPick)} alt={p.cupPick} className="w-8 h-8 object-contain"/>
                              {p.pointsBreakdown?.cupBonus > 0 && <span className="text-[10px] text-yellow-400 font-bold mt-1">✓ CORRECT</span>}
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
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
            </div>

            {Object.keys(trashTalk).map(id => {
              if (!trashTalk[id].text && !trashTalk[id].loading) return null;
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
              );
            })}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Pool Statistics</h3>
              <button 
                onClick={handleExportData}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
              >
                <HockeyIcon name="Share2" className="w-4 h-4" />
                Export CSV
              </button>
            </div>
            <StatsView participants={participants} officialResults={officialResults} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-120px)] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-slate-950 p-3 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><HockeyIcon name="Users"/> Pool Banter</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
              {chatMessages.length === 0 && <div className="text-center text-slate-500 mt-10">Be the first to talk some trash!</div>}
              {chatMessages.map((msg) => {
                const isMe = msg.created_by === user?.email;
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
                  onClick={() => { if (adminPasswordInput === 'admin') setIsAdmin(true); else alert('Incorrect'); }}
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
                    {Object.entries(ROUND_MATCHUPS_STRUCTURE).flatMap(([, matchups]) => matchups).map(m => {
                      const res = officialResults[m.id] || { winner: '', topGoalScorer: '', topPointScorer: '' };
                      return (
                        <div key={m.id} className="bg-slate-950 p-4 border border-slate-800 rounded-xl">
                          <h4 className="font-bold text-slate-300 mb-2">Matchup {m.id}</h4>
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              placeholder="Winner (Abbrev)" 
                              value={res.winner} 
                              onChange={e => handleUpdateOfficialResult(m.id, 'winner', e.target.value)} 
                              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                            />
                            <input 
                              type="text" 
                              placeholder="Top Goal Scorer" 
                              value={res.topGoalScorer} 
                              onChange={e => handleUpdateOfficialResult(m.id, 'topGoalScorer', e.target.value)} 
                              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                            />
                            <input 
                              type="text" 
                              placeholder="Top Point Scorer" 
                              value={res.topPointScorer} 
                              onChange={e => handleUpdateOfficialResult(m.id, 'topPointScorer', e.target.value)} 
                              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <h3 className="font-bold text-lg mb-4 text-red-400">Manage Live Matchup Teams (Rounds 2-4)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(ROUND_MATCHUPS_STRUCTURE).flatMap(([, matchups]) => matchups)
                      .filter(m => !((m.id.startsWith('E') || m.id.startsWith('W')) && m.id.length === 2))
                      .map(m => {
                        const lm = liveMatchups[m.id] || { t1: '', t2: '' };
                        return (
                          <div key={m.id} className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex gap-2">
                            <span className="font-bold text-slate-500 w-10 shrink-0">{m.id}</span>
                            <input 
                              type="text" 
                              placeholder="Team 1" 
                              value={lm.t1} 
                              onChange={e => handleUpdateLiveMatchup(m.id, 't1', e.target.value)} 
                              className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm uppercase"
                            />
                            <input 
                              type="text" 
                              placeholder="Team 2" 
                              value={lm.t2} 
                              onChange={e => handleUpdateLiveMatchup(m.id, 't2', e.target.value)} 
                              className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm uppercase"
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button onClick={() => setIsAdmin(false)} className="px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition-colors">
                    Lock Admin Console
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
