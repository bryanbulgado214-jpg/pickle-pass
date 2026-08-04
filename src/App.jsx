import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { C } from './lib/constants';
import { LOGO_ICON } from './lib/logos';
import { PersonAvatar, NotificationBell, PaddleIcon } from './components/ui';
import AuthScreen from './components/AuthScreen';
import FeedScreen from './components/FeedScreen';
import SessionsScreen from './components/SessionsScreen';
import ProfilePane from './components/ProfilePane';
import NotificationsScreen from './components/NotificationsScreen';
import MapView from './components/MapView';
import NetworkScreen from './components/NetworkScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import PlayerProfileScreen from './components/PlayerProfileScreen';
import TournamentDetail from './components/TournamentDetail';
import CancelSheet from './components/CancelSheet';
import MyGamesScreen from './components/MyGamesScreen';
import AdminConsole from './components/AdminConsole';
import { OwnerVerifyScreen, OwnerHome, OwnerNew, OwnerEarnings } from './components/OwnerScreens';
import OwnerAnalytics from './components/OwnerAnalytics';
import ChatScreen from './components/ChatScreen';

function AppInner() {
  const { user, profile, loading, signOut } = useAuth();
  const [tab, setTab] = useState('feed');
  const [showNotifications, setShowNotifications] = useState(false);
  const [overlay, setOverlay] = useState(null);
  const [overlayData, setOverlayData] = useState(null);
  const [mode, setMode] = useState('player');
  const [ownerTab, setOwnerTab] = useState('home');
  const [myCourts, setMyCourts] = useState([]);
  const [activeOwnerCourtId, setActiveOwnerCourtId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushDismissed, setPushDismissed] = useState(() => localStorage.getItem('pp_push_dismissed') === '1');

  useEffect(() => {
    if (!user) return;
    loadUnreadCount();
  }, [user]);

  useEffect(() => {
    if (mode === 'owner' && user) loadMyCourts();
  }, [mode, user]);

  async function loadUnreadCount() {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  }

  async function loadMyCourts() {
    const { data } = await supabase
      .from('courts')
      .select('*')
      .eq('owner_id', user.id);
    setMyCourts(data || []);
    if (data?.length && !activeOwnerCourtId) setActiveOwnerCourtId(data[0].id);
  }

  function openOverlay(name, data) {
    setOverlay(name);
    setOverlayData(data);
  }

  function closeOverlay() {
    setOverlay(null);
    setOverlayData(null);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.sand, fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const activeCourt = myCourts.find((c) => c.id === activeOwnerCourtId) || myCourts[0];

  const paddle = <PaddleIcon size={18} />;
  const playerNav = [
    ['feed', 'Feed', '\u{1F4F0}'],
    ['play', 'Play', paddle],
    ['map', 'Map', '\u{1F5FA}'],
    ['games', 'My Games', '\u{1F3AB}'],
    ['profile', 'Profile', '\u{1F464}'],
  ];

  const ownerNav = [
    ['home', 'Dashboard', '\u{1F3E0}'],
    ['analytics', 'Analytics', '\u{1F4CA}'],
    ['new', 'New Listing', '➕'],
    ['earnings', 'Payouts', '\u{1F4B0}'],
    ['player', '← Player', paddle],
  ];

  const navItems = mode === 'owner' ? ownerNav : playerNav;

  function handleNavClick(id) {
    if (id === 'player') {
      setMode('player');
      setTab('feed');
      return;
    }
    if (mode === 'owner') {
      setOwnerTab(id);
    } else {
      setTab(id);
    }
    setShowNotifications(false);
    closeOverlay();
  }

  function renderBody() {
    if (overlay === 'chat') return <ChatScreen onBack={closeOverlay} onOpenProfile={(id) => openOverlay('playerProfile', id)} />;
    if (overlay === 'network') return <NetworkScreen onBack={closeOverlay} onOpenProfile={(id) => openOverlay('playerProfile', id)} />;
    if (overlay === 'leaderboard') return <LeaderboardScreen onBack={closeOverlay} />;
    if (overlay === 'playerProfile') return <PlayerProfileScreen profileId={overlayData} onBack={closeOverlay} />;
    if (overlay === 'tournament') return <TournamentDetail tournament={overlayData.tournament} court={overlayData.court} onBack={closeOverlay} />;
    if (overlay === 'admin' && profile?.is_admin) return <AdminConsole onBack={closeOverlay} />;

    if (showNotifications) return <NotificationsScreen onBack={() => { setShowNotifications(false); loadUnreadCount(); }} />;

    if (mode === 'owner') {
      if (!activeCourt || !activeCourt.verified) {
        return (
          <OwnerVerifyScreen
            court={activeCourt}
            myCourts={myCourts}
            onSwitchCourt={setActiveOwnerCourtId}
            onSubmitted={async (courtId, data) => {
              if (courtId) {
                await supabase.from('courts').update({ ...data, owner_status: 'pending' }).eq('id', courtId);
              } else {
                await supabase.from('courts').insert({ ...data, owner_id: user.id, owner_status: 'pending' });
              }
              loadMyCourts();
            }}
          />
        );
      }
      if (ownerTab === 'home') return <OwnerHome court={activeCourt} myCourts={myCourts} activeOwnerCourtId={activeOwnerCourtId} onSwitchCourt={setActiveOwnerCourtId} />;
      if (ownerTab === 'analytics') return <OwnerAnalytics court={activeCourt} />;
      if (ownerTab === 'new') return <OwnerNew courtId={activeCourt.id} onPost={() => setOwnerTab('home')} />;
      if (ownerTab === 'earnings') return <OwnerEarnings />;
    }

    if (tab === 'feed') return <FeedScreen />;
    if (tab === 'play') return <SessionsScreen />;
    if (tab === 'map') return <MapView onOpenCourt={(ct) => openOverlay('court', ct)} />;
    if (tab === 'games') return <MyGamesScreen />;
    if (tab === 'profile') {
      return (
        <ProfilePane
          onOpenNetwork={() => openOverlay('network')}
          onOpenLeaderboard={() => openOverlay('leaderboard')}
          onOpenChat={() => openOverlay('chat')}
        />
      );
    }

    return null;
  }

  const activeNavId = mode === 'owner' ? ownerTab : tab;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="topBar">
        <div className="brand">
          <img src={LOGO_ICON} alt="" className="brandIcon" />
          <span className="brandName">Pickle<span style={{ color: C.ball }}> Pass</span></span>
        </div>
        <div className="topRight">
          {mode === 'player' && (
            <button
              className="modeSwitch"
              onClick={() => { setMode('owner'); setOwnerTab('home'); closeOverlay(); }}
              title="Switch to owner mode"
            >
              Owner
            </button>
          )}
          <button
            className="avatarMini"
            onClick={() => { setTab('profile'); setShowNotifications(false); closeOverlay(); setMode('player'); }}
          >
            <PersonAvatar name={profile?.full_name} photo={profile?.photo_url} size={34} />
          </button>
          <NotificationBell
            count={unreadCount}
            onClick={() => { setShowNotifications(true); closeOverlay(); }}
          />
          <button className="logout" onClick={signOut}>Log out</button>
        </div>
      </div>

      <div className="body">
        {!pushDismissed && 'Notification' in window && Notification.permission === 'default' && (
          <div className="pushBanner">
            <div className="pushBannerText">
              <strong>{"🔔"} Enable notifications</strong>
              <span>Get alerts for sessions, waitlist updates, and messages</span>
            </div>
            <div className="pushBannerBtns">
              <button className="pushAllow" onClick={async () => {
                const perm = await Notification.requestPermission();
                if (perm === 'granted') {
                  setPushDismissed(true);
                  localStorage.setItem('pp_push_dismissed', '1');
                }
              }}>Allow</button>
              <button className="pushDismiss" onClick={() => {
                setPushDismissed(true);
                localStorage.setItem('pp_push_dismissed', '1');
              }}>Not now</button>
            </div>
          </div>
        )}
        {renderBody()}
      </div>

      <div className="nav">
        {navItems.map(([id, label, icon]) => (
          <button
            key={id}
            className={activeNavId === id && !showNotifications && !overlay ? 'navOn' : ''}
            onClick={() => handleNavClick(id)}
          >
            <span className="navIcon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
