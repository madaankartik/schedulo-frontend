import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, CalendarDays, CheckCircle2, GraduationCap, KeyRound, Mail, Sparkles } from 'lucide-react';
import { API_URL, authenticate, getCurrentUser, getMyOrganization, getToken, googleLoginUrl, setToken } from './lib/auth';

export function AuthGate() {
  const [session, setSession] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const callbackToken = new URLSearchParams(window.location.search).get('token');
    if (callbackToken) {
      setToken(callbackToken);
      window.history.replaceState({}, '', '/');
    }
    const token = callbackToken || getToken();
    getCurrentUser(token).then(async (user) => {
      if (!user) { setSession(null); setLoading(false); return; }
      const nextSession = { access_token: token, user };
      setSession(nextSession);
      try { setOrganization(await getMyOrganization(token)); } catch { setOrganization(null); }
      setLoading(false);
    });
  }, []);

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
  const [mode, setMode] = useState(() => window.location.pathname === '/signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSent(false);
    window.history.pushState({}, '', nextMode === 'signup' ? '/signup' : '/login');
  };
  const submitPasswordAuth = async (event) => {
    event.preventDefault();
    setError('');
    setSent(false);
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await authenticate(mode === 'signin' ? 'login' : 'signup', { email, password, ...(mode === 'signup' ? { full_name: fullName } : {}) });
      window.location.assign('/');
    } catch (authError) { setError(authError.message); }
  };
  const signInWithGoogle = async () => {
    window.location.href = googleLoginUrl;
  };
  const isSignup = mode === 'signup';
  return <div className="auth-shell"><div className="auth-decoration"><div className="orb orb-one" /><div className="orb orb-two" /><div className="auth-hero"><div className="hero-brand"><div className="brand-mark"><Sparkles size={21} /></div><div><strong>Schedulo</strong><small>SMART SCHEDULING</small></div></div><div className="hero-copy"><div className="hero-kicker"><CalendarDays size={15} /> YOUR WEEK, IN SYNC</div><h2>Build a calmer week.</h2><p>Create conflict-free schedules for schools, colleges, and teams in minutes.</p></div><div className="hero-table"><div className="hero-table-top"><span>WEEKLY OVERVIEW</span><b><CheckCircle2 size={13} /> No clashes</b></div><div className="hero-grid"><div className="hero-grid-corner" />{['MON','TUE','WED','THU','FRI'].map((day) => <span className="hero-day" key={day}>{day}</span>)}{['P1','P2','P3','P4'].map((period, row) => <React.Fragment key={period}><span className="hero-period">{period}</span>{['Maths','English','Science','Art','Maths'].map((subject, col) => <span className={`hero-cell tone-${(row + col) % 4}`} key={`${period}-${col}`}><b>{subject}</b><small>{['6A','7A','8A'][col % 3]}</small></span>)}</React.Fragment>)}</div></div><div className="hero-stats"><div><strong>0</strong><span>teacher clashes</span></div><div><strong>5 min</strong><span>to first draft</span></div><div><strong>1 view</strong><span>for every class</span></div></div><div className="auth-note"><Sparkles size={16} /><span>Scheduling that feels lighter.</span></div></div></div><div className="auth-panel"><div className="auth-brand"><div className="brand-mark"><Sparkles size={21} /></div><div><strong>Schedulo</strong><small>SMART SCHEDULING</small></div></div><div className="auth-copy"><div className="eyebrow"><KeyRound size={14} /> WORKSPACE ACCESS</div><h1>{isSignup ? 'Create your account.' : 'Welcome back.'}</h1><p>{isSignup ? 'Start organizing your schedule in minutes.' : 'Sign in to continue to your scheduling workspace.'}</p></div>{sent ? <div className="sent-state"><CheckCircle2 size={28} /><h2>Account created</h2><p>{sentMessage}</p><button className="link-button" onClick={() => switchMode('signin')}>Go to sign in</button></div> : <><button className="oauth-button" onClick={signInWithGoogle}><svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.84 5.84 0 0 1-2.2 3.31v2.75h3.57c2.09-1.92 3.27-4.74 3.27-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.29-2.68l-3.57-2.75c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.53H2.16v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.06H2.16A11 11 0 0 0 1 12c0 1.79.43 3.48 1.16 4.94l3.69-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.66l3.15-3.15C17.45 2.02 14.97 1 12 1A11 11 0 0 0 2.16 7.06l3.69 2.84C6.72 7.31 9.14 5.38 12 5.38z"/></svg><span>Continue with Google</span><ArrowRight size={16} /></button><div className="auth-divider"><span>or continue with email</span></div><form className="auth-form" onSubmit={submitPasswordAuth}>{isSignup && <label>Full name<input type="text" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jane Doe" /></label>}<label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="6+ characters" /></label>{isSignup && <label>Confirm password<input type="password" required minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" /></label>}{error && <div className="auth-error">{error}</div>}<button className="primary-button auth-submit">{isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button></form><div className="auth-switch">{isSignup ? 'Already have an account?' : 'New to Schedulo?'} <button type="button" onClick={() => switchMode(isSignup ? 'signin' : 'signup')}>{isSignup ? 'Sign in' : 'Create an account'}</button></div><small className="auth-legal">By continuing, you agree to Schedulo’s terms and privacy policy.</small></>}</div></div>;
}

function OrganizationSetup({ session, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('school');
  const [academicYear, setAcademicYear] = useState(() => { const year = new Date().getFullYear(); return `${year}–${String(year + 1).slice(-2)}`; });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const createOrganization = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/organizations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ name, type, academic_year: academicYear }) });
      if (!response.ok) throw new Error((await response.json()).detail || 'Could not create organization');
      onCreated(await response.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return <div className="org-shell"><div className="org-card"><div className="auth-brand"><div className="brand-mark"><Sparkles size={21} /></div><div><strong>Schedulo</strong><small>SMART SCHEDULING</small></div></div><div className="org-progress"><span className="done"><CheckCircle2 size={14} /></span><i /><span className="current">2</span></div><div className="auth-copy"><div className="eyebrow"><Building2 size={14} /> YOUR WORKSPACE</div><h1>Create your organization.</h1><p>This can be your school, college, institute, or any team that needs coordinated schedules.</p></div><form className="org-form" onSubmit={createOrganization}><label>Organization name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Your School or College" /></label><label>Academic year<input required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} placeholder="e.g. 2026–27" /></label><label>What are you scheduling?<div className="org-options"><button type="button" className={type === 'school' ? 'org-option selected' : 'org-option'} onClick={() => setType('school')}><GraduationCap size={20} /><span><strong>School</strong><small>Classes, teachers, and periods</small></span>{type === 'school' && <CheckCircle2 size={17} />}</button><button type="button" className={type === 'college' ? 'org-option selected' : 'org-option'} onClick={() => setType('college')}><Building2 size={20} /><span><strong>College / institute</strong><small>Departments, rooms, and courses</small></span>{type === 'college' && <CheckCircle2 size={17} />}</button></div></label>{error && <div className="auth-error">{error}</div>}<button className="primary-button auth-submit" disabled={loading}>{loading ? 'Creating workspace…' : 'Create workspace'} <ArrowRight size={17} /></button></form></div></div>;
}
