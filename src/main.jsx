import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, ArrowRight, BookOpen, Building2, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, GraduationCap,
  LayoutDashboard, Menu, Plus, Settings2, Sparkles, Trash2, Users, WandSparkles,
  AlertTriangle, CheckCircle2, SlidersHorizontal, X
} from 'lucide-react';
import './styles.css';

const steps = ['School', 'Classes', 'Periods', 'Subjects', 'Teachers', 'Assignments', 'Review'];
const quickClasses = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const subjectColors = { English: '#e4ad36', Hindi: '#d77751', Mathematics: '#4b8fd1', Science: '#78ad63', 'Social Studies': '#be6791', Computer: '#7d70c4', Art: '#e78963' };

export function App({ organization, session }) {
  const [step, setStep] = useState(0);
  const [school, setSchool] = useState({ name: organization?.name || 'Laurels International School', year: organization?.academic_year || '2026–27' });
  const [classes, setClasses] = useState(['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3']);
  const [sections, setSections] = useState({ Nursery: ['A'], LKG: ['A'], UKG: ['A'], 'Class 1': ['A'], 'Class 2': ['A'], 'Class 3': ['A'] });
  const [days, setDays] = useState(5);
  const [periods, setPeriods] = useState(8);
  const [subjects, setSubjects] = useState(['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies']);
  const [frequencies, setFrequencies] = useState({ Nursery: { English: 4, Mathematics: 4, Hindi: 3 }, LKG: { English: 4, Mathematics: 4, Hindi: 3 } });
  const [teachers, setTeachers] = useState([
    { name: 'Anita Sharma', email: 'anita@laurels.edu', assignments: 3, initials: 'AS' },
    { name: 'Rohan Mehta', email: 'rohan@laurels.edu', assignments: 2, initials: 'RM' },
    { name: 'Priya Kapoor', email: 'priya@laurels.edu', assignments: 1, initials: 'PK' },
  ]);
  const [assignments, setAssignments] = useState([
    { teacher: 'Anita Sharma', subject: 'English', className: 'Nursery A', periods: 4 },
    { teacher: 'Rohan Mehta', subject: 'Mathematics', className: 'Nursery A', periods: 4 },
    { teacher: 'Priya Kapoor', subject: 'Hindi', className: 'Nursery A', periods: 3 },
  ]);
  const [customClass, setCustomClass] = useState('');
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [toast, setToast] = useState('');
  const [schoolId, setSchoolId] = useState(organization?.school_id || null);
  const [apiStatus, setApiStatus] = useState('connected');
  const [generated, setGenerated] = useState(null);

  const totalSections = Object.values(sections).reduce((sum, list) => sum + list.length, 0);
  const totalFrequency = Object.values(frequencies).reduce((sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0), 0);
  const blockers = Math.max(0, totalSections * 3 - assignments.length - 4);
  const activeStep = steps[step];

  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };
  const buildSetup = () => ({ days, periods, classes, sections, subjects, frequencies, teachers, assignments });
  const authHeaders = () => ({ 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) });
  const saveSetup = async () => {
    if (!schoolId) return false;
    const response = await fetch(`http://localhost:8000/api/v1/schools/${schoolId}/setup`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ name: school.name, academic_year: school.year, setup: buildSetup() }) });
    return response.ok;
  };
  const generate = async () => {
    try {
      const saved = await saveSetup();
      if (!saved) { notify('Start the backend with python run.py first'); return; }
      const response = await fetch(`http://localhost:8000/api/v1/schools/${schoolId}/generate`, { method: 'POST', headers: authHeaders() });
      const result = await response.json();
      setGenerated(result);
      notify(result.status === 'INFEASIBLE' ? 'Fix the setup blockers before generating' : `Generated ${result.entries.length} timetable periods`);
    } catch { notify('Backend is offline — run python run.py'); }
  };
  const toggleClass = (name) => {
    if (classes.includes(name)) setClasses(classes.filter((item) => item !== name));
    else { setClasses([...classes, name]); setSections({ ...sections, [name]: ['A'] }); }
  };
  const addCustomClass = () => {
    const value = customClass.trim();
    if (!value || classes.includes(value)) return;
    setClasses([...classes, value]); setSections({ ...sections, [value]: ['A'] }); setCustomClass('');
  };
  const addSection = (className) => setSections({ ...sections, [className]: [...(sections[className] || []), String.fromCharCode(65 + (sections[className]?.length || 0))] });
  const updateFrequency = (className, subject, delta) => {
    const row = frequencies[className] || {};
    setFrequencies({ ...frequencies, [className]: { ...row, [subject]: Math.max(0, (row[subject] || 0) + delta) } });
  };

  const next = async () => { await saveSetup(); if (step < steps.length - 1) setStep(step + 1); else await generate(); };
  const previous = () => setStep(Math.max(0, step - 1));

  return (
    <div className="app-shell">
      <Sidebar step={step} setStep={setStep} />
      <main className="main-shell">
        <Topbar school={school} />
        <div className="page-wrap">
          <div className="eyebrow"><Sparkles size={14} /> SETUP WORKSPACE</div>
          <div className="page-heading-row">
            <div><h1>Build your timetable, calmly.</h1><p>Set up the essentials once. Schedulo will keep every class, teacher, and room in sync.</p></div>
            <div className="save-state"><span className={`save-dot ${apiStatus}`} /> {apiStatus === 'connected' ? 'Connected to Schedulo API' : apiStatus === 'offline' ? 'Offline preview' : 'Connecting…'} <ChevronDown size={15} /></div>
          </div>
          <Stepper step={step} setStep={setStep} />
          <section className="step-content">
            {step === 0 && <SchoolStep school={school} setSchool={setSchool} />}
            {step === 1 && <ClassesStep classes={classes} sections={sections} toggleClass={toggleClass} addSection={addSection} customClass={customClass} setCustomClass={setCustomClass} addCustomClass={addCustomClass} totalSections={totalSections} />}
            {step === 2 && <PeriodsStep days={days} setDays={setDays} periods={periods} setPeriods={setPeriods} classes={classes} />}
            {step === 3 && <SubjectsStep subjects={subjects} setSubjects={setSubjects} classes={classes} frequencies={frequencies} updateFrequency={updateFrequency} totalFrequency={totalFrequency} />}
            {step === 4 && <TeachersStep teachers={teachers} setTeachers={setTeachers} assignments={assignments} setAssignments={setAssignments} showAddTeacher={showAddTeacher} setShowAddTeacher={setShowAddTeacher} notify={notify} />}
            {step === 5 && <AssignmentsStep assignments={assignments} setAssignments={setAssignments} teachers={teachers} subjects={subjects} classes={classes} notify={notify} />}
            {step === 6 && <ReviewStep school={school} schoolId={schoolId} classes={classes} totalSections={totalSections} days={days} periods={periods} subjects={subjects} teachers={teachers} assignments={assignments} blockers={blockers} setStep={setStep} notify={notify} generated={generated} onGenerate={generate} />}
          </section>
          <div className="wizard-footer"><button className="ghost-button" onClick={previous} disabled={step === 0}><ArrowLeft size={17} /> Back</button><div className="footer-note">{step === 6 ? 'Review the setup before generating' : 'You can return and edit this step later'}</div><button className="primary-button" onClick={next}>{step === 6 ? 'Save & generate' : 'Continue'} <ArrowRight size={17} /></button></div>
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={17} /> {toast}</div>}
    </div>
  );
}

function Sidebar({ step, setStep }) {
  const nav = [
    { label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
    { label: 'Setup wizard', icon: WandSparkles, group: 'Setup', step: 0 },
    { label: 'Classes', icon: GraduationCap, group: 'Setup', step: 1 },
    { label: 'Teachers', icon: Users, group: 'Setup', step: 4 },
    { label: 'Subjects', icon: BookOpen, group: 'Setup', step: 3 },
    { label: 'Generate timetable', icon: Sparkles, group: 'Schedule', step: 6 },
    { label: 'View timetable', icon: CalendarDays, group: 'Schedule', step: 6 },
    { label: 'Adjustments', icon: SlidersHorizontal, group: 'Schedule' },
    { label: 'Absences & substitutes', icon: Clock3, group: 'Daily operations' },
    { label: 'Teacher workload', icon: Settings2, group: 'Insights' },
    { label: 'Settings', icon: Settings2, group: 'Account' },
  ];
  let lastGroup = '';
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark"><CalendarDays size={23} strokeWidth={2.2} /></div><div><div className="brand-name">Schedulo</div><div className="brand-sub">SMART SCHEDULING</div></div></div>
    <nav>{nav.map((item) => { const showGroup = item.group !== lastGroup; lastGroup = item.group; const Icon = item.icon; const active = item.step === step || (item.step === undefined && item.label === 'Dashboard' && step === -1); return <React.Fragment key={item.label}>{showGroup && <div className="nav-group">{item.group}</div>}<button className={`nav-item ${active ? 'active' : ''}`} onClick={() => item.step !== undefined && setStep(item.step)}><Icon size={18} /> <span>{item.label}</span>{item.label === 'Absences & substitutes' && <span className="nav-badge">2</span>}</button></React.Fragment>; })}</nav>
    <div className="sidebar-bottom"><button className="collapse-button"><ChevronLeft size={17} /> Collapse</button><div className="help-link"><CircleHelp size={16} /> Help center</div></div>
  </aside>;
}

function Topbar({ school }) { return <header className="topbar"><div className="school-context"><div className="school-icon"><Building2 size={18} /></div><div><strong>{school.name}</strong><span>{school.year} <b>Coordinator</b></span></div></div><div className="top-actions"><button className="icon-button"><CircleHelp size={18} /></button><div className="avatar">KM</div><ChevronDown size={16} /></div></header>; }

function Stepper({ step, setStep }) { return <div className="stepper">{steps.map((label, index) => <React.Fragment key={label}><button className={`step-chip ${index === step ? 'current' : ''} ${index < step ? 'complete' : ''}`} onClick={() => setStep(index)}><span>{index < step ? <Check size={14} /> : index + 1}</span>{label}</button>{index < steps.length - 1 && <div className={`step-line ${index < step ? 'complete' : ''}`} />}</React.Fragment>)}</div>; }

function Card({ icon: Icon, title, description, accent = 'blue', children, className = '' }) { return <div className={`card ${className}`}><div className="card-title-row"><div className={`card-icon ${accent}`}><Icon size={20} /></div><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>{children}</div>; }

function SchoolStep({ school, setSchool }) { return <div className="stack"><Card icon={Building2} title="School information" description="The basics. You can refine these later from Settings." accent="blue"><div className="form-grid"><label>School name<input value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} /></label><label>Academic year<input value={school.year} onChange={(e) => setSchool({ ...school, year: e.target.value })} /></label></div><div className="hint-box"><Sparkles size={17} /><div><strong>Start with the essentials</strong><span>Schedulo saves your progress as you go. Nothing becomes final until you publish.</span></div></div></Card><Card icon={SlidersHorizontal} title="Scheduling style" description="Choose the defaults Schedulo should use when generating your first draft." accent="coral"><div className="option-grid"><button className="option selected"><span className="option-dot" /><div><strong>Balanced week</strong><small>Spread core subjects and protect teacher breaks.</small></div><Check size={17} /></button><button className="option"><span className="option-dot" /><div><strong>Compact day</strong><small>Prefer fewer gaps and tighter teaching blocks.</small></div></button></div></Card></div>; }

function ClassesStep({ classes, sections, toggleClass, addSection, customClass, setCustomClass, addCustomClass, totalSections }) { return <div className="stack"><Card icon={GraduationCap} title="Classes & sections" description="Add the grades you teach. Each class starts with Section A." accent="coral"><div className="stat-inline"><span><strong>{classes.length}</strong> classes</span><span><strong>{totalSections}</strong> sections</span></div><div className="mini-label">QUICK ADD</div><div className="chip-wrap">{quickClasses.map((name) => <button key={name} className={`choice-chip ${classes.includes(name) ? 'selected' : ''}`} onClick={() => toggleClass(name)}>{classes.includes(name) ? <Check size={14} /> : <Plus size={14} />}{name}</button>)}</div><div className="mini-label">OR ADD CUSTOM</div><div className="inline-input"><input value={customClass} onChange={(e) => setCustomClass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomClass()} placeholder="e.g. Pre-Primary, Class 11 Commerce" /><button className="secondary-button" onClick={addCustomClass}><Plus size={16} /> Add</button></div></Card><Card icon={GraduationCap} title="Sections" description="Add parallel sections where a grade has more than one class." accent="yellow"><div className="list-card">{classes.map((name) => <div className="list-row" key={name}><div><strong>{name}</strong><small>{sections[name]?.length || 0} section{sections[name]?.length === 1 ? '' : 's'}</small></div><div className="section-pills">{(sections[name] || []).map((section) => <span key={section}>{section}<button onClick={() => {}}><X size={11} /></button></span>)}<button className="add-inline" onClick={() => addSection(name)}><Plus size={14} /> Section</button></div><Trash2 size={16} className="muted-action" /></div>)}</div></Card></div>; }

function PeriodsStep({ days, setDays, periods, setPeriods, classes }) { return <div className="stack"><Card icon={CalendarDays} title="Working days" description="Most schools run Monday–Friday; Saturday can be added for a six-day week." accent="blue"><div className="segmented"><button className={days === 5 ? 'selected' : ''} onClick={() => setDays(5)}>5-day week <small>Mon–Fri</small></button><button className={days === 6 ? 'selected' : ''} onClick={() => setDays(6)}>6-day week <small>Mon–Sat</small></button></div><div className="day-row">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => <span className={i < days ? 'on' : ''} key={day}>{day}</span>)}</div></Card><Card icon={Clock3} title="Periods per class" description="Set the regular teaching periods. You can fine-tune individual classes later." accent="coral"><div className="bulk-control"><span><small>BULK APPLY</small><strong>Regular periods</strong></span><div className="stepper-control"><button onClick={() => setPeriods(Math.max(1, periods - 1))}>−</button><b>{periods}</b><button onClick={() => setPeriods(periods + 1)}>+</button></div><button className="secondary-button">Apply to all</button></div><div className="class-period-list">{classes.map((name) => <div key={name}><span>{name}</span><div className="stepper-control compact"><button>−</button><b>{periods}</b><button>+</button></div></div>)}</div></Card></div>; }

function SubjectsStep({ subjects, setSubjects, classes, frequencies, updateFrequency, totalFrequency }) { const [newSubject, setNewSubject] = useState(''); const [selectedClass, setSelectedClass] = useState(classes[0]); const addSubject = () => { if (newSubject.trim() && !subjects.includes(newSubject.trim())) { setSubjects([...subjects, newSubject.trim()]); setNewSubject(''); } }; return <div className="stack"><Card icon={BookOpen} title="Subject library" description="Keep one master list. Subject colors stay consistent across every timetable view." accent="blue"><div className="subject-grid">{subjects.map((subject) => <div className="subject-card" key={subject}><span className="subject-swatch" style={{ background: subjectColors[subject] || '#6b7fc1' }}>{subject[0]}</span><div><strong>{subject}</strong><small>{subject === 'English' || subject === 'Mathematics' ? 'Core subject' : 'Available to assign'}</small></div><button onClick={() => setSubjects(subjects.filter((item) => item !== subject))}><Trash2 size={15} /></button></div>)}</div><div className="inline-input"><input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubject()} placeholder="e.g. Robotics, Music" /><button className="secondary-button" onClick={addSubject}><Plus size={16} /> Add subject</button></div></Card><Card icon={SlidersHorizontal} title="Frequency by class" description="How many periods per week should each subject run in each class?" accent="yellow"><div className="class-tabs">{classes.map((name) => <button className={selectedClass === name ? 'active' : ''} key={name} onClick={() => setSelectedClass(name)}>{name}<small>{Object.values(frequencies[name] || {}).reduce((a, b) => a + b, 0)}/40</small></button>)}</div><div className="coverage-line"><span>{selectedClass}</span><b>{Object.values(frequencies[selectedClass] || {}).reduce((a, b) => a + b, 0)} / 40 periods per week</b></div><div className="frequency-list">{subjects.slice(0, 5).map((subject) => <div key={subject}><span><i style={{ background: subjectColors[subject] || '#6b7fc1' }} />{subject}</span><div className="stepper-control compact"><button onClick={() => updateFrequency(selectedClass, subject, -1)}>−</button><b>{frequencies[selectedClass]?.[subject] || 0}</b><button onClick={() => updateFrequency(selectedClass, subject, 1)}>+</button></div></div>)}</div></Card></div>; }

function TeachersStep({ teachers, setTeachers, assignments, setAssignments, showAddTeacher, setShowAddTeacher, notify }) { const [draft, setDraft] = useState({ name: '', email: '' }); const addTeacher = () => { if (!draft.name.trim()) return; setTeachers([...teachers, { ...draft, initials: draft.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), assignments: 0 }]); setDraft({ name: '', email: '' }); setShowAddTeacher(false); notify('Teacher added'); }; return <div className="stack"><div className="summary-strip"><Metric label="Teachers" value={teachers.length} icon={Users} /><Metric label="Class teachers" value="0" icon={GraduationCap} /><Metric label="Assignments" value={assignments.length} icon={BookOpen} /><Metric label="Periods / week" value={assignments.reduce((sum, item) => sum + item.periods, 0)} icon={Clock3} /></div><Card icon={Users} title="Teaching team" description="Add staff and the subjects/classes they teach." accent="blue"><div className="card-actions"><button className="secondary-button" onClick={() => setShowAddTeacher(true)}><Plus size={16} /> Add teacher</button></div>{showAddTeacher && <div className="add-row"><input placeholder="Teacher name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><input placeholder="Email (optional)" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /><button className="primary-button small" onClick={addTeacher}>Save</button><button className="ghost-button small" onClick={() => setShowAddTeacher(false)}>Cancel</button></div>}<div className="search-row"><input placeholder="Search by name or email" /><div className="filter-pills"><button className="active">All</button><button>Class teachers</button><button>Coordinators</button></div></div><div className="teacher-list">{teachers.map((teacher) => <div className="teacher-row" key={teacher.email || teacher.name}><div className="teacher-avatar">{teacher.initials}</div><div className="teacher-info"><strong>{teacher.name}</strong><small>{teacher.email || 'No email added'}</small></div><span className="teacher-periods">{teacher.assignments} assignments</span><button className="icon-button"><Settings2 size={16} /></button><button className="icon-button"><Trash2 size={16} /></button></div>)}</div></Card></div>; }

function AssignmentsStep({ assignments, setAssignments, teachers, subjects, classes, notify }) { const [form, setForm] = useState({ teacher: teachers[0]?.name || '', subject: subjects[0] || '', className: `${classes[0] || 'Class'} A`, periods: 3 }); const addAssignment = () => { setAssignments([...assignments, { ...form, periods: Number(form.periods) }]); notify('Teaching assignment added'); }; return <div className="stack"><Card icon={SlidersHorizontal} title="Teaching assignments" description="Connect each teacher, subject, class, and weekly period requirement." accent="coral"><div className="assignment-form"><label>Teacher<select value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}>{teachers.map((teacher) => <option key={teacher.name}>{teacher.name}</option>)}</select></label><label>Subject<select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Class<select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}>{classes.map((name) => <option key={name}>{name} A</option>)}</select></label><label>Periods / week<input type="number" min="1" max="12" value={form.periods} onChange={(e) => setForm({ ...form, periods: e.target.value })} /></label><button className="primary-button" onClick={addAssignment}><Plus size={16} /> Add</button></div><div className="assignment-list">{assignments.map((item, index) => <div className="assignment-row" key={`${item.teacher}-${item.subject}-${index}`}><span className="subject-swatch tiny" style={{ background: subjectColors[item.subject] || '#6b7fc1' }} /><div><strong>{item.subject}</strong><small>{item.className} · {item.teacher}</small></div><b>{item.periods} / wk</b><button className="icon-button" onClick={() => setAssignments(assignments.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div>)}</div></Card><Card icon={SlidersHorizontal} title="Scheduling rules" description="Start with a few powerful rules. Add advanced rules after the first draft." accent="yellow"><div className="rule-list"><label className="toggle-row"><span><strong>Spread core subjects</strong><small>Prefer one core subject per day where possible.</small></span><input type="checkbox" defaultChecked /></label><label className="toggle-row"><span><strong>Protect teacher breaks</strong><small>Avoid more than three consecutive periods.</small></span><input type="checkbox" defaultChecked /></label><label className="toggle-row"><span><strong>Keep double periods together</strong><small>Useful for labs and practical sessions.</small></span><input type="checkbox" /></label></div></Card></div>; }

function ReviewStep({ school, schoolId, classes, totalSections, days, periods, subjects, teachers, assignments, blockers, setStep, notify, generated, onGenerate }) { const cards = [{ label: 'School', value: school.name, sub: school.year, icon: Building2, step: 0, accent: 'blue' }, { label: 'Classes', value: `${classes.length} classes`, sub: `${totalSections} sections`, icon: GraduationCap, step: 1, accent: 'coral' }, { label: 'Periods', value: `${periods} regular`, sub: `${days}-day week`, icon: Clock3, step: 2, accent: 'yellow' }, { label: 'Subjects', value: `${subjects.length} subjects`, sub: 'Library ready', icon: BookOpen, step: 3, accent: 'blue' }, { label: 'Teachers', value: `${teachers.length} teachers`, sub: `${assignments.length} assignments`, icon: Users, step: 4, accent: 'coral' }, { label: 'Coverage', value: blockers ? `${blockers} blockers` : 'Ready to generate', sub: blockers ? 'Fix missing assignments' : 'All essentials covered', icon: blockers ? AlertTriangle : CheckCircle2, step: 5, accent: blockers ? 'red' : 'green' }]; return <div className="stack"><div className={`review-banner ${blockers ? 'warning' : 'ready'}`}><div className="review-banner-icon">{blockers ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}</div><div><h2>{blockers ? 'A few things need attention' : 'Your setup is ready'}</h2><p>{blockers ? `${blockers} coverage items stand between you and a generated timetable. Fix them below or jump to the relevant step.` : 'All essentials are covered. You can generate a first timetable now.'}</p></div></div><div className="review-grid">{cards.map((card) => { const Icon = card.icon; return <button className="review-card" key={card.label} onClick={() => setStep(card.step)}><div className={`card-icon ${card.accent}`}><Icon size={18} /></div><div className="mini-label">{card.label}</div><strong>{card.value}</strong><small>{card.sub}</small><ChevronRight size={16} className="review-arrow" /></button>; })}</div><Card icon={AlertTriangle} title="Pre-flight checks" description="Schedulo will run these checks again before the solver starts." accent="red"><div className="check-list"><div><CheckCircle2 size={17} /><span>No class double-booking</span><b>Ready</b></div><div><CheckCircle2 size={17} /><span>Teacher availability</span><b>Ready</b></div><div><CheckCircle2 size={17} /><span>Subject coverage</span><b>{blockers ? 'Review' : 'Ready'}</b></div></div><button className="primary-button generate-button" onClick={onGenerate}><Sparkles size={17} /> Generate timetable</button>{generated && <div className={`generation-result ${generated.status === 'INFEASIBLE' ? 'failed' : ''}`}><strong>{generated.status === 'INFEASIBLE' ? 'Generation needs attention' : `Generated ${generated.entries.length} periods`}</strong><span>{generated.status === 'INFEASIBLE' ? generated.diagnostics?.[0] : `Solver finished in ${generated.solveSeconds || '—'} seconds.`}</span></div>}</Card>{generated?.entries?.length > 0 && <><SchedulePreview entries={generated.entries} /><AbsencePanel schoolId={schoolId} teachers={teachers} notify={notify} /></>}</div>; }

function SchedulePreview({ entries }) { const days = [...new Set(entries.map((entry) => entry.day))]; const periods = [...new Set(entries.map((entry) => entry.period))].sort((a, b) => a - b); return <Card icon={CalendarDays} title="Generated timetable" description="A live preview from the CP-SAT engine. Every class and teacher assignment comes from the same master schedule." accent="green"><div className="schedule-meta"><span><CheckCircle2 size={14} /> {entries.length} periods placed</span><span>Class view · sample output</span></div><div className="schedule-table"><div className="schedule-head"><span>Period</span>{days.map((day) => <span key={day}>{day.slice(0, 3)}</span>)}</div>{periods.map((period) => <div className="schedule-row" key={period}><strong>P{period}</strong>{days.map((day) => { const entry = entries.find((item) => item.day === day && item.period === period); return <div className="schedule-cell" key={`${day}-${period}`}>{entry ? <><b style={{ color: subjectColors[entry.subject] || '#3157d5' }}>{entry.subject}</b><small>{entry.className} · {entry.teacher}</small></> : <span>—</span>}</div>; })}</div>)}</div></Card>; }

function AbsencePanel({ schoolId, teachers, notify }) { const [teacher, setTeacher] = useState(teachers[0]?.name || ''); const [date, setDate] = useState('2026-08-18'); const [result, setResult] = useState(null); const checkAbsence = async () => { if (!schoolId) { notify('Connect the backend before checking absences'); return; } const response = await fetch(`http://localhost:8000/api/v1/schools/${schoolId}/absences`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, teacher, reason: 'Planned absence' }) }); setResult(await response.json()); }; return <Card icon={Clock3} title="Daily absence coverage" description="Create a date-specific exception without changing the approved base timetable." accent="coral"><div className="absence-form"><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Absent teacher<select value={teacher} onChange={(e) => setTeacher(e.target.value)}>{teachers.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><button className="secondary-button" onClick={checkAbsence}><Users size={16} /> Find substitutes</button></div>{result && <div className="absence-result"><strong>{result.affected?.length || 0} affected periods</strong><span>Available substitutes: {result.candidates?.length ? result.candidates.join(', ') : 'No conflict-free candidates found'}</span></div>}</Card>; }

function Metric({ label, value, icon: Icon }) { return <div className="metric"><Icon size={18} /><div><small>{label}</small><strong>{value}</strong></div></div>; }
