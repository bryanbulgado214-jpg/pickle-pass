import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { LoadingBall } from './ui';

const REWARD_POINTS = 50;

export default function ReferralScreen({ onBack }) {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const code = profile?.referral_code || user.id.slice(0, 8).toUpperCase();
  const link = `${window.location.origin}?ref=${code}`;

  useEffect(() => {
    loadReferrals();
  }, []);

  async function loadReferrals() {
    setLoading(true);
    if (!profile?.referral_code) {
      await supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', user.id);
    }

    const { data } = await supabase
      .from('referrals')
      .select('*, referred:referred_id(full_name, photo_url, created_at)')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });
    setReferrals(data || []);
    setLoading(false);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Pickle Pass!',
          text: `Join me on Pickle Pass and we both earn ${REWARD_POINTS} points! Use my referral code: ${code}`,
          url: link,
        });
      } catch (_) {}
    } else {
      copyCode();
    }
  }

  const totalEarned = referrals.length * REWARD_POINTS;

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"← Back"}</button>
      <div className="paneHead">
        <div className="h1">INVITE FRIENDS</div>
        <div className="sub">Share your code and you both earn {REWARD_POINTS} points</div>
      </div>

      <div className="referralCard">
        <div className="referralCodeLabel">Your referral code</div>
        <div className="referralCode">{code}</div>
        <div className="referralBtns">
          <button className="cta" style={{ flex: 1, marginTop: 0 }} onClick={shareLink}>
            Share Link
          </button>
          <button className="ghostBtn" style={{ flex: 1 }} onClick={copyCode}>
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>

      <div className="statGrid" style={{ marginTop: 14 }}>
        <div className="stat">
          <div className="statK">FRIENDS INVITED</div>
          <div className="statV" style={{ color: C.ball }}>{referrals.length}</div>
        </div>
        <div className="stat">
          <div className="statK">POINTS EARNED</div>
          <div className="statV" style={{ color: C.ok }}>{totalEarned} pts</div>
        </div>
      </div>

      <div className="h2">REFERRAL HISTORY</div>
      {loading && <LoadingBall />}
      {!loading && referrals.length === 0 && (
        <div className="sub">No referrals yet. Share your code to start earning!</div>
      )}
      {referrals.map((r) => (
        <div key={r.id} className="referralRow">
          <div className="referralRowInfo">
            <div className="cardTitle" style={{ fontSize: 14 }}>{r.referred?.full_name || 'Player'}</div>
            <div className="cardMeta">
              Joined {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="referralReward">+{REWARD_POINTS} pts</div>
        </div>
      ))}
    </div>
  );
}
