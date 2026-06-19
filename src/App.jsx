import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';
import { missingEnv, supabase } from './supabaseClient';
import { PASSING_SCORE, onboardingSections, resourceFiles, statusSteps, testQuestions } from './trainingData';

const blankApplication = {
  full_name: '',
  email: '',
  phone: '',
  city_state: '',
  sales_experience: '',
  why_join: '',
  industries: '',
  availability: '',
  referral_source: ''
};

const availabilityOptions = ['Immediately', 'In a few weeks', 'In a months time'];

function clean(value){ return String(value || '').trim(); }
function money(value){ return Number(value || 0).toLocaleString('en-US', { style:'currency', currency:'USD' }); }
function label(value){ return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function todayIso(){ return new Date().toISOString().slice(0, 10); }

function App(){
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(missingEnv){
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => sub.subscription.unsubscribe();
  }, []);

  if(missingEnv){
    return <Notice title="Missing Supabase keys" text="Create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in this portal folder." />;
  }

  if(loading){
    return <Notice title="Loading Salesman Portal" text="Checking your login session..." />;
  }

  return session ? <Portal session={session} /> : <Auth />;
}

function Notice({ title, text }){
  return (
    <main className="auth-wrap">
      <motion.section className="auth-card" initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}>
        <img src="/logo.png" className="auth-logo" alt="RE IMAGE logo" />
        <div className="kicker">Salesman Portal</div>
        <h1>{title}</h1>
        <p className="muted">{text}</p>
      </motion.section>
    </main>
  );
}

function Auth(){
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e){
    e.preventDefault();
    setBusy(true);
    setError(false);
    setNotice(mode === 'login' ? 'Signing in...' : 'Creating account...');

    const payload = { email: clean(email), password };
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword(payload)
      : await supabase.auth.signUp(payload);

    setBusy(false);

    if(result.error){
      setError(true);
      setNotice(result.error.message);
      return;
    }

    if(mode === 'signup'){
      setNotice('Account created. Check your email if confirmation is enabled, then log in.');
    }
  }

  return (
    <main className="auth-wrap">
      <motion.form className="auth-card" onSubmit={submit} initial={{ opacity:0, y:22 }} animate={{ opacity:1, y:0 }}>
        <img src="/logo.png" className="auth-logo" alt="RE IMAGE logo" />
        <div className="kicker">Salesman Portal</div>
        <h1>{mode === 'login' ? 'Sales Login' : 'Create Sales Account'}</h1>
        <p className="muted">Apply, track approval, complete onboarding, pass the exam, and unlock your dashboard.</p>

        <label>Email</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />

        <label>Password</label>
        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required />

        <button className="btn btn-primary full" disabled={busy}>{mode === 'login' ? 'Log In' : 'Create Account'}</button>
        {notice && <div className={`notice show ${error ? 'error' : ''}`}>{notice}</div>}

        <button className="text-link" type="button" onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setNotice('');
          setError(false);
        }}>
          {mode === 'login' ? 'Need a sales account?' : 'Already have an account?'}
        </button>
      </motion.form>
    </main>
  );
}

function Portal({ session }){
  const [application, setApplication] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [qrRequests, setQrRequests] = useState([]);
  const [invoiceRequests, setInvoiceRequests] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('status');
  const [notice, setNotice] = useState('');

  const status = application?.status || profile?.status || 'applicant';
  const completed = progress.filter(p => p.completed).map(p => p.section_id);
  const onboardingDone = onboardingSections.every(section => completed.includes(section.id));
  const lastAttempt = attempts[0] || null;
  const dashboardUnlocked = status === 'active_salesman' || Boolean(lastAttempt?.passed);

  async function load(){
    setLoading(true);
    setNotice('');

    const email = clean(session.user.email);
    const [{ data: appData }, { data: profileData }, { data: progressData }, { data: testData }] = await Promise.all([
      supabase
        .from('sales_applications')
        .select('*')
        .or(`user_id.eq.${session.user.id},email.eq.${email}`)
        .order('submitted_at', { ascending:false })
        .limit(1)
        .maybeSingle(),
      supabase.from('salesman_profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('onboarding_progress').select('*').eq('user_id', session.user.id),
      supabase.from('sales_tests').select('*').eq('user_id', session.user.id).order('submitted_at', { ascending:false })
    ]);

    let linkedApplication = appData || null;
    let linkedProfile = profileData || null;

    if(linkedApplication && !linkedApplication.user_id){
      const { data: claimedApplication } = await supabase
        .from('sales_applications')
        .update({ user_id: session.user.id })
        .eq('id', linkedApplication.id)
        .select()
        .single();

      linkedApplication = claimedApplication || linkedApplication;
    }

    if(linkedApplication && !linkedProfile){
      const { data: createdProfile } = await supabase
        .from('salesman_profiles')
        .upsert({
          user_id: session.user.id,
          full_name: linkedApplication.full_name,
          email: linkedApplication.email,
          phone: linkedApplication.phone,
          city_state: linkedApplication.city_state,
          status: linkedApplication.status || 'pending_review',
          commission_rate: 20
        }, { onConflict: 'user_id' })
        .select()
        .single();

      linkedProfile = createdProfile || linkedProfile;
    }

    setApplication(linkedApplication);
    setProfile(linkedProfile || null);
    setProgress(progressData || []);
    setAttempts(testData || []);

    if(linkedProfile?.id){
      await loadDashboardData(linkedProfile.id);
    }

    setLoading(false);
  }

  async function loadDashboardData(salesmanId){
    const [leadResult, taskResult, qrResult, invoiceResult, commissionResult] = await Promise.all([
      supabase.from('sales_leads').select('*').eq('assigned_salesman_id', salesmanId).order('updated_at', { ascending:false }),
      supabase.from('sales_tasks').select('*').eq('salesman_id', salesmanId).order('due_date', { ascending:true }),
      supabase.from('qr_code_requests').select('*').eq('salesman_id', salesmanId).order('created_at', { ascending:false }),
      supabase.from('invoice_requests').select('*').eq('salesman_id', salesmanId).order('created_at', { ascending:false }),
      supabase.from('commissions').select('*').eq('salesman_id', salesmanId).order('created_at', { ascending:false })
    ]);

    setLeads(leadResult.data || []);
    setTasks(taskResult.data || []);
    setQrRequests(qrResult.data || []);
    setInvoiceRequests(invoiceResult.data || []);
    setCommissions(commissionResult.data || []);
  }

  useEffect(() => { load(); }, []);

  async function signOut(){
    await supabase.auth.signOut();
  }

  async function upsertProfile(payload){
    const profilePayload = {
      user_id: session.user.id,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      city_state: payload.city_state,
      status: 'pending_review',
      commission_rate: 20
    };

    await supabase.from('salesman_profiles').upsert(profilePayload, { onConflict: 'user_id' });
  }

  async function submitApplication(payload){
    setNotice('Submitting application...');
    const applicationPayload = {
      ...payload,
      user_id: session.user.id,
      email: clean(payload.email || session.user.email),
      status: 'pending_review'
    };

    const { error } = await supabase.from('sales_applications').insert(applicationPayload);
    if(error){
      setNotice(error.message);
      return;
    }

    await upsertProfile(applicationPayload);
    setNotice('Application submitted. You can track the review status here.');
    await load();
  }

  async function markSection(sectionId){
    await supabase.from('onboarding_progress').upsert({
      user_id: session.user.id,
      section_id: sectionId,
      completed: true,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,section_id' });

    if(application && status === 'accepted'){
      await supabase.from('sales_applications').update({ status:'onboarding' }).eq('id', application.id);
    }

    await load();
  }

  async function submitTest(answers){
    const correct = testQuestions.filter(q => answers[q.id] === q.answer).length;
    const score = Math.round((correct / testQuestions.length) * 100);
    const passed = score >= PASSING_SCORE;

    await supabase.from('sales_tests').insert({
      user_id: session.user.id,
      attempt_number: attempts.length + 1,
      answers,
      score,
      passed
    });

    if(application){
      await supabase.from('sales_applications').update({ status: passed ? 'active_salesman' : 'testing', test_score: score }).eq('id', application.id);
    }
    if(profile){
      await supabase.from('salesman_profiles').update({ status: passed ? 'active_salesman' : 'testing' }).eq('id', profile.id);
    }

    setNotice(passed ? `Passed with ${score}%. Dashboard unlocked.` : `Score: ${score}%. Passing score is ${PASSING_SCORE}%.`);
    await load();
    setView(passed ? 'dashboard' : 'test');
  }

  if(loading){
    return <Notice title="Loading Sales Flow" text="Pulling your application, onboarding, and dashboard status..." />;
  }

  if(!application){
    return <ApplicationForm session={session} submitApplication={submitApplication} notice={notice} signOut={signOut} />;
  }

  return (
    <div className="portal-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="RE IMAGE logo" />
          <span>Salesman Portal</span>
        </div>
        <div className="top-actions">
          <span className="admin-email">{session.user.email}</span>
          <button className="btn btn-light" onClick={load}>Refresh</button>
          <button className="btn btn-light" onClick={signOut}>Sign Out</button>
        </div>
      </header>

      <main className="main">
        <StatusHero application={application} onboardingDone={onboardingDone} lastAttempt={lastAttempt} dashboardUnlocked={dashboardUnlocked} />
        {notice && <div className="notice show">{notice}</div>}

        <nav className="tabs">
          <button className={`tab ${view === 'status' ? 'active' : ''}`} onClick={() => setView('status')}>Status</button>
          <button className={`tab ${view === 'onboarding' ? 'active' : ''}`} disabled={!['accepted','onboarding','testing','active_salesman'].includes(status)} onClick={() => setView('onboarding')}>Onboarding</button>
          <button className={`tab ${view === 'test' ? 'active' : ''}`} disabled={!onboardingDone} onClick={() => setView('test')}>Exam</button>
          <button className={`tab ${view === 'dashboard' ? 'active' : ''}`} disabled={!dashboardUnlocked} onClick={() => setView('dashboard')}>Dashboard</button>
          <button className={`tab ${view === 'resources' ? 'active' : ''}`} onClick={() => setView('resources')}>Resources</button>
        </nav>

        <AnimatePresence mode="wait">
          {view === 'status' && <StatusView key="status" application={application} status={status} />}
          {view === 'onboarding' && <Onboarding key="onboarding" completed={completed} markSection={markSection} />}
          {view === 'test' && <Test key="test" onboardingDone={onboardingDone} submitTest={submitTest} lastAttempt={lastAttempt} />}
          {view === 'dashboard' && <Dashboard key="dashboard" profile={profile} leads={leads} tasks={tasks} qrRequests={qrRequests} invoiceRequests={invoiceRequests} commissions={commissions} reload={load} />}
          {view === 'resources' && <Resources key="resources" />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ApplicationForm({ session, submitApplication, notice, signOut }){
  const [form, setForm] = useState({ ...blankApplication, email: session.user.email || '' });

  function update(field, value){
    setForm(current => ({ ...current, [field]: value }));
  }

  return (
    <main className="auth-wrap">
      <motion.form className="application-card" onSubmit={e => { e.preventDefault(); submitApplication(form); }} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
        <div className="form-head">
          <img src="/logo.png" className="auth-logo" alt="RE IMAGE logo" />
          <div>
            <div className="kicker">Sales Application</div>
            <h1>Apply To Join The Sales Team</h1>
            <p className="muted">Approved applicants complete onboarding and must pass the final exam before their dashboard unlocks.</p>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Full name" value={form.full_name} onChange={v => update('full_name', v)} required />
          <Field label="Email" type="email" value={form.email} onChange={v => update('email', v)} required />
          <Field label="Phone" value={form.phone} onChange={v => update('phone', v)} required />
          <Field label="City/state" value={form.city_state} onChange={v => update('city_state', v)} required />
          <Field
            label="Availability"
            value={form.availability}
            onChange={v => update('availability', v)}
            options={availabilityOptions}
            required
          />
          <Field label="Referral source" value={form.referral_source} onChange={v => update('referral_source', v)} required />
        </div>
        <Field textarea label="Sales experience" value={form.sales_experience} onChange={v => update('sales_experience', v)} required />
        <Field textarea label="Why do you want to sell for RE IMAGE?" value={form.why_join} onChange={v => update('why_join', v)} required />
        <Field textarea label="What industries do you know best?" value={form.industries} onChange={v => update('industries', v)} required />
        <div className="action-row">
          <button className="btn btn-primary" type="submit">Submit Application</button>
          <button className="btn btn-secondary" type="button" onClick={signOut}>Sign Out</button>
        </div>
        {notice && <div className="notice show">{notice}</div>}
      </motion.form>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', textarea = false, required = false, options = null }){
  return (
    <div className="form-group">
      <label>{label}</label>
      {textarea
        ? <textarea className="input" value={value} onChange={e => onChange(e.target.value)} required={required} />
        : options
          ? (
            <select className="input" value={value} onChange={e => onChange(e.target.value)} required={required}>
              <option value="" disabled>Select availability</option>
              {options.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          )
          : <input className="input" type={type} value={value} onChange={e => onChange(e.target.value)} required={required} />}
    </div>
  );
}

function StatusHero({ application, onboardingDone, lastAttempt, dashboardUnlocked }){
  return (
    <section className="hero-panel">
      <div>
        <div className="kicker">Current Stage</div>
        <h1>{dashboardUnlocked ? 'Dashboard Unlocked' : label(application.status)}</h1>
        <p className="muted">Dashboard access stays locked until admin accepts the application, onboarding is complete, and the exam score is at least {PASSING_SCORE}%.</p>
      </div>
      <div className="hero-stats">
        <strong>{application.status === 'active_salesman' ? 'Active' : application.status === 'rejected' ? 'Rejected' : 'In Flow'}</strong>
        <span>Onboarding: {onboardingDone ? 'Complete' : 'Locked/In Progress'}</span>
        <span>Exam: {lastAttempt ? `${lastAttempt.score}%` : 'Not taken'}</span>
      </div>
    </section>
  );
}

function StatusView({ application, status }){
  const activeIndex = Math.max(0, statusSteps.findIndex(([key]) => key === status));

  return (
    <motion.section className="panel" initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="panel-head">
        <div>
          <div className="kicker">Application Tracker</div>
          <h2>{application.status === 'rejected' ? 'Application Not Approved' : 'Progress Timeline'}</h2>
        </div>
      </div>
      {application.status === 'rejected' && <p className="status-message">Thank you for applying. This application was not approved at this time.</p>}
      {application.status === 'pending_review' && <p className="status-message">Your application is under review.</p>}
      <div className="timeline">
        {statusSteps.map(([key, title], index) => (
          <div className={`timeline-step ${index <= activeIndex || status === 'active_salesman' ? 'done' : ''}`} key={key}>
            <span>{index + 1}</span>
            <strong>{title}</strong>
          </div>
        ))}
      </div>
      <div className="detail-grid">
        <Info label="Name" value={application.full_name} />
        <Info label="Email" value={application.email} />
        <Info label="Phone" value={application.phone} />
        <Info label="City/state" value={application.city_state} />
        <Info label="Availability" value={application.availability} />
        <Info label="Industries" value={application.industries} />
      </div>
    </motion.section>
  );
}

function Info({ label, value }){
  return <div className="info-box"><span>{label}</span><strong>{value || '—'}</strong></div>;
}

function Onboarding({ completed, markSection }){
  const completeCount = completed.length;
  return (
    <motion.section className="panel" initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="panel-head">
        <div>
          <div className="kicker">Guided Rulebook</div>
          <h2>Onboarding Study Guide</h2>
        </div>
        <div className="progress-pill">{completeCount}/{onboardingSections.length} complete</div>
      </div>
      <div className="progress-bar"><motion.span initial={{ width:0 }} animate={{ width:`${(completeCount / onboardingSections.length) * 100}%` }} /></div>
      <div className="resource-grid">
        {onboardingSections.map(section => {
          const done = completed.includes(section.id);
          return (
            <motion.article className={`resource-card ${done ? 'done' : ''}`} key={section.id} whileHover={{ y:-3 }}>
              <span>{done ? 'Complete' : 'Required'}</span>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
              <button className="btn btn-primary" disabled={done} onClick={() => markSection(section.id)}>{done ? 'Completed' : 'Mark Complete'}</button>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

function Test({ onboardingDone, submitTest, lastAttempt }){
  const [answers, setAnswers] = useState({});

  if(!onboardingDone){
    return <div className="panel locked"><h2>Exam Locked</h2><p className="muted">Complete every onboarding section before taking the final exam.</p></div>;
  }

  return (
    <motion.form className="panel" initial={{ opacity:0 }} animate={{ opacity:1 }} onSubmit={e => { e.preventDefault(); submitTest(answers); }}>
      <div className="panel-head">
        <div>
          <div className="kicker">Passing Score: {PASSING_SCORE}%</div>
          <h2>Final Salesman Exam</h2>
        </div>
        {lastAttempt && <div className="progress-pill">Last score: {lastAttempt.score}%</div>}
      </div>
      <div className="question-list">
        {testQuestions.map((q, index) => (
          <fieldset className="question-card" key={q.id}>
            <legend>{index + 1}. {q.question}</legend>
            {q.options.map(option => (
              <label className="option-row" key={option}>
                <input type="radio" name={q.id} value={option} checked={answers[q.id] === option} onChange={() => setAnswers(current => ({ ...current, [q.id]: option }))} required />
                {option}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <button className="btn btn-primary" type="submit">Submit Exam</button>
    </motion.form>
  );
}

function Dashboard({ profile, leads, tasks, qrRequests, invoiceRequests, commissions, reload }){
  const assignedCount = leads.length;
  const pendingInvoices = invoiceRequests.filter(r => !['completed','closed'].includes(r.status)).length;
  const pendingQr = qrRequests.filter(r => !['completed','closed'].includes(r.status)).length;
  const closedWon = leads.filter(l => l.status === 'closed_won').length;
  const estimatedCommission = commissions.reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

  return (
    <motion.section initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="stats">
        <Stat label="Commission Rate" value={`${profile?.commission_rate || 20}%`} />
        <Stat label="Assigned Leads" value={assignedCount} />
        <Stat label="Pending Invoices" value={pendingInvoices} />
        <Stat label="Pending QR" value={pendingQr} />
        <Stat label="Closed Won" value={closedWon} />
        <Stat label="Estimated Commission" value={money(estimatedCommission)} />
      </div>
      <div className="work-grid">
        <LeadPanel leads={leads} reload={reload} profile={profile} />
        <RequestPanel profile={profile} reload={reload} />
      </div>
      <div className="work-grid">
        <CalendarPanel leads={leads} tasks={tasks} />
        <CommissionPanel commissions={commissions} />
      </div>
    </motion.section>
  );
}

function Stat({ label, value }){
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong></article>;
}

function LeadPanel({ leads, reload, profile }){
  const [noteText, setNoteText] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  async function addNote(){
    if(!selectedLead || !clean(noteText)) return;
    await supabase.from('sales_lead_notes').insert({
      lead_id: selectedLead.id,
      salesman_id: profile?.id,
      note: noteText
    });
    setNoteText('');
    reload();
  }

  return (
    <div className="panel">
      <div className="panel-head"><h2>Assigned Leads</h2></div>
      <div className="lead-list">
        {leads.length ? leads.map(lead => (
          <button className={`lead-row ${selectedLead?.id === lead.id ? 'active' : ''}`} key={lead.id} onClick={() => setSelectedLead(lead)}>
            <strong>{lead.business_name}</strong>
            <span>{label(lead.status || 'new')} • {lead.service_interest || 'Service TBD'}</span>
            <small>{lead.next_follow_up || 'No follow-up set'}</small>
          </button>
        )) : <p className="muted pad">No assigned leads yet.</p>}
      </div>
      {selectedLead && (
        <div className="lead-detail">
          <h3>{selectedLead.business_name}</h3>
          <p className="muted">{selectedLead.contact_name} • {selectedLead.phone} • {selectedLead.email}</p>
          <p className="muted">Estimated value: {money(selectedLead.estimated_value)} • Industry: {selectedLead.industry || '—'}</p>
          <textarea className="input" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a timestamped note for admin..." />
          <button className="btn btn-primary" onClick={addNote}>Add Note</button>
        </div>
      )}
    </div>
  );
}

function RequestPanel({ profile, reload }){
  const [type, setType] = useState('invoice');
  const [form, setForm] = useState({});

  function update(field, value){ setForm(current => ({ ...current, [field]: value })); }

  async function submit(e){
    e.preventDefault();
    const table = type === 'invoice' ? 'invoice_requests' : 'qr_code_requests';
    const payload = type === 'invoice'
      ? {
          salesman_id: profile?.id,
          client_name: form.client_name,
          client_email: form.client_email,
          client_phone: form.client_phone,
          service_package: form.service_package,
          price: Number(form.price || 0),
          deposit_required: Boolean(form.deposit_required),
          special_terms: form.special_terms,
          due_date: form.due_date,
          notes: form.notes,
          status: 'pending'
        }
      : {
          salesman_id: profile?.id,
          client_name: form.client_name,
          destination_url: form.destination_url,
          purpose: form.purpose,
          preferred_label: form.preferred_label,
          needed_by: form.needed_by,
          notes: form.notes,
          status: 'pending'
        };

    await supabase.from(table).insert(payload);
    setForm({});
    reload();
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel-head">
        <h2>Admin Requests</h2>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="invoice">Invoice</option>
          <option value="qr">QR Code</option>
        </select>
      </div>
      <Field label="Client/business name" value={form.client_name || ''} onChange={v => update('client_name', v)} required />
      {type === 'invoice' ? (
        <>
          <Field label="Client email" type="email" value={form.client_email || ''} onChange={v => update('client_email', v)} required />
          <Field label="Client phone" value={form.client_phone || ''} onChange={v => update('client_phone', v)} required />
          <Field label="Service/package sold" value={form.service_package || ''} onChange={v => update('service_package', v)} required />
          <Field label="Price" type="number" value={form.price || ''} onChange={v => update('price', v)} required />
          <Field label="Due date" type="date" value={form.due_date || todayIso()} onChange={v => update('due_date', v)} />
          <Field textarea label="Special terms / notes" value={form.notes || ''} onChange={v => update('notes', v)} />
        </>
      ) : (
        <>
          <Field label="Destination URL" type="url" value={form.destination_url || ''} onChange={v => update('destination_url', v)} required />
          <Field label="Purpose" value={form.purpose || ''} onChange={v => update('purpose', v)} required />
          <Field label="Preferred label/caption" value={form.preferred_label || ''} onChange={v => update('preferred_label', v)} />
          <Field label="Needed by" type="date" value={form.needed_by || todayIso()} onChange={v => update('needed_by', v)} />
          <Field textarea label="Notes" value={form.notes || ''} onChange={v => update('notes', v)} />
        </>
      )}
      <button className="btn btn-primary" type="submit">Submit Request</button>
    </form>
  );
}

function CalendarPanel({ leads, tasks }){
  const items = [
    ...leads.filter(l => l.next_follow_up).map(l => ({ date:l.next_follow_up, title:`Follow up: ${l.business_name}` })),
    ...tasks.filter(t => t.due_date).map(t => ({ date:t.due_date, title:t.title }))
  ].slice(0, 12);

  return (
    <div className="panel">
      <div className="panel-head"><h2>Follow-Up Calendar</h2></div>
      {items.length ? items.map(item => <div className="calendar-row" key={`${item.date}-${item.title}`}><strong>{item.date}</strong><span>{item.title}</span></div>) : <p className="muted pad">No follow-ups or tasks assigned.</p>}
    </div>
  );
}

function CommissionPanel({ commissions }){
  return (
    <div className="panel">
      <div className="panel-head"><h2>Commission Tracker</h2></div>
      {commissions.length ? commissions.map(item => (
        <div className="calendar-row" key={item.id}>
          <strong>{money(item.commission_amount)}</strong>
          <span>{money(item.deal_value)} deal • {label(item.status || 'pending')}</span>
        </div>
      )) : <p className="muted pad">No commission records yet.</p>}
    </div>
  );
}

function Resources(){
  return (
    <motion.section className="panel" initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="panel-head">
        <div>
          <div className="kicker">Built-In Materials</div>
          <h2>Sales Resource Hub</h2>
        </div>
      </div>
      <div className="resource-grid">
        {resourceFiles.map(([title, href]) => (
          <a className="resource-card" href={href} target="_blank" rel="noreferrer" key={href}>
            <span>PDF</span>
            <h3>{title}</h3>
            <p>Open the official RE IMAGE training material.</p>
          </a>
        ))}
      </div>
      <div className="script-grid">
        <article className="script-card"><h3>30 Second Explanation</h3><p>RE IMAGE helps local businesses modernize their online presence and operations with websites, portals, automations, QR systems, invoice flows, and cleaner digital workflows.</p></article>
        <article className="script-card"><h3>Core Offer</h3><p>We help owners get customers, manage customers, and reduce repetitive work so the business looks sharper and runs cleaner.</p></article>
        <article className="script-card"><h3>Objection Frame</h3><p>The real question is whether the current system is costing time, leads, trust, or follow-up. If it is, we can map the first fix.</p></article>
      </div>
    </motion.section>
  );
}

createRoot(document.getElementById('app')).render(<App />);
