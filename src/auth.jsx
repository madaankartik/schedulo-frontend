import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, GraduationCap, KeyRound, Mail, Sparkles } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AuthGate() {
  const [session, setSession] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) return <AuthScreen configured={false} />;
  if (loading) return <div className="auth-loading"><div className="brand-mark"><Sparkles size={22} /></div><p>Checking your Schedulo session…</p></div>;
  if (!session) return <AuthScreen configured />;
  if (!organization) return <OrganizationSetup session={session} onCreated={setOrganization} />;
  return <AppWithAuth session={session} organization={organization} />;
}

function AppWithAuth({ session, organization }) {
  // Lazy import keeps the large workspace component isolated from the auth surface.
  const [Workspace, setWorkspace] = useState(null);
  useEffect(() => { import('./main.jsx').then((module) => setWorkspace(() => module.App)); }, []);
  return Workspace ? <Workspace session={session} organization={organization} /> : <div className="auth-loading"><p>Loading your workspace…</p></div>;
}

export function AuthScreen({ configured }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const sendMagicLink = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setError('');
    const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (authError) setError(authError.message); else setSent(true);
  };
  const signInWithGoogle = async () => {
    if (!supabase) return;
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (authError) setError(authError.message);
  };
  return <div className="auth-shell"><div className="auth-decoration"><div className="orb orb-one" /><div className="orb orb-two" /><div className="auth-note"><Sparkles size={16} /><span>Scheduling that feels lighter.</span></div></div><div className="auth-panel"><div className="auth-brand"><div className="brand-mark"><Sparkles size={21} /></div><div><strong>Schedulo</strong><small>SMART SCHEDULING</small></div></div><div className="auth-copy"><div className="eyebrow"><KeyRound size={14} /> WORKSPACE ACCESS</div><h1>Make room for a better week.</h1><p>Sign in to create your school or college workspace and start building schedules that stay in sync.</p></div>{!configured ? <div className="config-callout"><strong>Connect Supabase to enable login</strong><span>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env, then restart the dev server.</span></div> : sent ? <div className="sent-state"><CheckCircle2 size={28} /><h2>Check your inbox</h2><p>We sent a secure sign-in link to <strong>{email}</strong>.</p><button className="link-button" onClick={() => setSent(false)}>Use another email</button></div> : <><button className="oauth-button" onClick={signInWithGoogle}><span className="google-mark">G</span> Continue with Google <ArrowRight size={16} /></button><div className="auth-divider"><span>or use a magic link</span></div><form className="auth-form" onSubmit={sendMagicLink}><label>Email address<div className="input-icon"><Mail size={17} /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" /></div></label>{error && <div className="auth-error">{error}</div>}<button className="primary-button auth-submit">Send magic link <ArrowRight size={17} /></button></form><small className="auth-legal">By continuing, you agree to Schedulo’s terms and privacy policy.</small></>}</div></div>;
}

function OrganizationSetup({ session, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('school');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const createOrganization = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/organizations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ name, type }) });
      if (!response.ok) throw new Error((await response.json()).detail || 'Could not create organization');
      onCreated(await response.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return <div className="org-shell"><div className="org-card"><div className="auth-brand"><div className="brand-mark"><Sparkles size={21} /></div><div><strong>Schedulo</strong><small>SMART SCHEDULING</small></div></div><div className="org-progress"><span className="done"><CheckCircle2 size={14} /></span><i /><span className="current">2</span></div><div className="auth-copy"><div className="eyebrow"><Building2 size={14} /> YOUR WORKSPACE</div><h1>Create your organization.</h1><p>This can be your school, college, institute, or any team that needs coordinated schedules.</p></div><form className="org-form" onSubmit={createOrganization}><label>Organization name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Laurels International School" /></label><label>What are you scheduling?<div className="org-options"><button type="button" className={type === 'school' ? 'org-option selected' : 'org-option'} onClick={() => setType('school')}><GraduationCap size={20} /><span><strong>School</strong><small>Classes, teachers, and periods</small></span>{type === 'school' && <CheckCircle2 size={17} />}</button><button type="button" className={type === 'college' ? 'org-option selected' : 'org-option'} onClick={() => setType('college')}><Building2 size={20} /><span><strong>College / institute</strong><small>Departments, rooms, and courses</small></span>{type === 'college' && <CheckCircle2 size={17} />}</button></div></label>{error && <div className="auth-error">{error}</div>}<button className="primary-button auth-submit" disabled={loading}>{loading ? 'Creating workspace…' : 'Create workspace'} <ArrowRight size={17} /></button></form></div></div>;
}
