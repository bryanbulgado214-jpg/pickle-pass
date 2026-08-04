import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Ball, PersonAvatar } from './ui';

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'New to pickleball or still learning the basics' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Comfortable with rallies, dinks, and basic strategy' },
  { id: 'advanced', label: 'Advanced', desc: 'Competitive play, tournament experience' },
];

export default function OnboardingWizard({ onComplete }) {
  const { user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [skill, setSkill] = useState(null);
  const [hometown, setHometown] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleFinish() {
    setSaving(true);
    const updates = {};
    if (skill) updates.skill_level = skill;
    if (hometown.trim()) updates.hometown = hometown.trim();

    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, photoFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(path);
        updates.photo_url = `${urlData.publicUrl}?t=${Date.now()}`;
      }
    }

    if (Object.keys(updates).length > 0) {
      try { await updateProfile(updates); } catch (_) {}
    }

    localStorage.setItem('pp_onboarded', '1');
    setSaving(false);
    onComplete();
  }

  return (
    <div className="onboarding">
      <div className="onboardingInner">
        {step === 0 && (
          <>
            <div className="onboardingIcon"><Ball size={48} /></div>
            <h1 className="h1" style={{ marginTop: 16 }}>Welcome to Pickle Pass!</h1>
            <p className="sub" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Let{"'"}s set up your profile so other players can find you on the courts of Siquijor.
            </p>
            <button className="cta" style={{ marginTop: 24 }} onClick={() => setStep(1)}>
              Get Started
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="onboardingStep">STEP 1 OF 3</div>
            <h2 className="h1">What{"'"}s your skill level?</h2>
            <p className="sub" style={{ marginTop: 4 }}>This helps us match you with the right sessions</p>
            <div className="skillPicker">
              {SKILL_LEVELS.map((s) => (
                <button
                  key={s.id}
                  className={"skillOption" + (skill === s.id ? " selected" : "")}
                  onClick={() => setSkill(s.id)}
                >
                  <div className="skillLabel">{s.label}</div>
                  <div className="skillDesc">{s.desc}</div>
                </button>
              ))}
            </div>
            <button className="cta" style={{ marginTop: 20 }} onClick={() => setStep(2)} disabled={!skill}>
              Next
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="onboardingStep">STEP 2 OF 3</div>
            <h2 className="h1">Add a profile photo</h2>
            <p className="sub" style={{ marginTop: 4 }}>So other players can recognize you</p>
            <div className="onboardingPhoto" onClick={() => fileRef.current?.click()}>
              {photoPreview ? (
                <img src={photoPreview} alt="" className="onboardingPhotoImg" />
              ) : (
                <PersonAvatar name={profile?.full_name} size={100} />
              )}
              <div className="onboardingPhotoLabel">Tap to upload</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
            <button className="cta" style={{ marginTop: 20 }} onClick={() => setStep(3)}>
              {photoPreview ? 'Next' : 'Skip for now'}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="onboardingStep">STEP 3 OF 3</div>
            <h2 className="h1">Where are you based?</h2>
            <p className="sub" style={{ marginTop: 4 }}>Help nearby players find you</p>
            <div className="formRow" style={{ marginTop: 16 }}>
              <input
                className="input"
                placeholder="e.g. San Juan, Siquijor"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
              />
            </div>
            <button className="cta" style={{ marginTop: 20 }} onClick={handleFinish} disabled={saving}>
              {saving ? 'Setting up...' : 'Start Playing!'}
            </button>
          </>
        )}

        {step > 0 && step < 3 && (
          <button className="linkBtn" style={{ marginTop: 12 }} onClick={() => setStep(step - 1)}>
            {"← Back"}
          </button>
        )}

        <div className="onboardingDots">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={"onboardingDot" + (step === i ? " active" : "")} />
          ))}
        </div>
      </div>
    </div>
  );
}
