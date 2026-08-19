import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import "./styles.css";
import { API_URL, clearToken } from "./lib/auth";

const steps = [
  "School",
  "Classes",
  "Periods",
  "Subjects",
  "Teachers",
  "Review",
];
const quickClasses = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];
const commonSubjects = [
  "English",
  "Mathematics",
  "Science",
  "Social Studies",
  "Hindi",
  "Computer",
  "Art",
  "Physical Education",
  "Music",
];
const classOrder = new Map(quickClasses.map((name, index) => [name, index]));
const sortClasses = (items) =>
  [...items].sort((a, b) => {
    const aIndex = classOrder.get(a);
    const bIndex = classOrder.get(b);
    if (aIndex !== undefined || bIndex !== undefined) {
      return (aIndex ?? quickClasses.length) - (bIndex ?? quickClasses.length);
    }
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
const baseClassFor = (className, classes) =>
  [...classes]
    .sort((a, b) => b.length - a.length)
    .find((name) => className === name || className?.startsWith(`${name} `)) ||
  className;
const classDailyPeriods = (classPeriods, periods, className, classes) =>
  Number(classPeriods?.[baseClassFor(className, classes)] || periods || 0);
const subjectColors = {
  English: "#e4ad36",
  Hindi: "#d77751",
  Mathematics: "#4b8fd1",
  Science: "#78ad63",
  "Social Studies": "#be6791",
  Computer: "#7d70c4",
  Art: "#e78963",
};

export function App({ organization, session }) {
  const stepStorageKey = `schedulo_step_${organization?.school_id || "draft"}`;
  const draftStorageKey = `schedulo_setup_draft_${organization?.school_id || "draft"}`;
  const [step, setStep] = useState(() =>
    Number(window.localStorage.getItem(stepStorageKey) || 0),
  );
  const [school, setSchool] = useState({
    name: organization?.name || "",
    year: organization?.academic_year || "",
  });
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState({});
  const [days, setDays] = useState(5);
  const [periods, setPeriods] = useState(0);
  const [classPeriods, setClassPeriods] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [frequencies, setFrequencies] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [customClass, setCustomClass] = useState("");
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [toast, setToast] = useState("");
  const [schoolId, setSchoolId] = useState(organization?.school_id || null);
  const [hydrated, setHydrated] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [page, setPage] = useState("setup");
  const [generating, setGenerating] = useState(false);

  const totalSections = Object.values(sections).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0,
  );
  const totalFrequency = Object.values(frequencies).reduce(
    (sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0),
    0,
  );
  const maxDailyPeriods = Math.max(
    Number(periods || 0),
    ...classes.map((name) => Number(classPeriods[name] || 0)),
  );
  const classLoads = assignments.reduce(
    (loads, item) => ({
      ...loads,
      [item.className]:
        (loads[item.className] || 0) + Number(item.periods || 0),
    }),
    {},
  );
  const teacherLoads = assignments.reduce(
    (loads, item) => ({
      ...loads,
      [item.teacher]: (loads[item.teacher] || 0) + Number(item.periods || 0),
    }),
    {},
  );
  const preflight = {
    classCapacity: Object.entries(classLoads).some(
      ([name, load]) =>
        load >
        days *
          classDailyPeriods(classPeriods, periods, name, classes),
    ),
    teacherCapacity: Object.values(teacherLoads).some(
      (load) => load > days * maxDailyPeriods,
    ),
    // The solver can place a subject twice on a day when its weekly frequency
    // is greater than the number of working days (for example, 6 periods over
    // a 5-day week). Flag only frequencies that exceed that supported limit.
    frequency: assignments.some((item) => Number(item.periods || 0) > days * 2),
    coverage:
      !classes.length ||
      !subjects.length ||
      !teachers.length ||
      !assignments.length,
  };
  const blockers = Object.values(preflight).filter(Boolean).length;
  const activeStep = steps[step];

  useEffect(() => {
    window.localStorage.setItem(stepStorageKey, String(step));
  }, [step, stepStorageKey]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const buildSetup = () => ({
    days,
    periods,
    classPeriods,
    classes,
    sections,
    subjects,
    frequencies,
    teachers,
    assignments,
    generated,
  });
  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  });
  const readSetupDraft = () => {
    try {
      return JSON.parse(window.localStorage.getItem(draftStorageKey) || "null");
    } catch {
      return null;
    }
  };
  const writeSetupDraft = () => {
    const savedAt = Date.now();
    const previous = readSetupDraft();
    const draft = {
      savedAt,
      syncedAt: previous?.syncedAt || 0,
      data: {
        name: school.name,
        academic_year: school.year,
        setup: buildSetup(),
      },
    };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    return draft;
  };
  const markSetupDraftSynced = (savedAt) => {
    const draft = readSetupDraft();
    if (!draft || draft.savedAt !== savedAt) return;
    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({ ...draft, syncedAt: savedAt }),
    );
  };
  const applySetupData = (data) => {
    if (!data) return;
    setSchool({ name: data.name || "", year: data.academic_year || "" });
    const saved = data.setup || {};
    if (saved.classes) setClasses(saved.classes);
    if (saved.sections) {
      const activeClasses = new Set(saved.classes || []);
      setSections(
        Object.fromEntries(
          Object.entries(saved.sections).filter(([name]) =>
            activeClasses.has(name),
          ),
        ),
      );
    }
    if (saved.days) setDays(saved.days);
    if (saved.periods) setPeriods(saved.periods);
    setClassPeriods(saved.classPeriods || {});
    if (saved.subjects) setSubjects(saved.subjects);
    if (saved.frequencies) setFrequencies(saved.frequencies);
    if (saved.teachers) setTeachers(saved.teachers);
    if (saved.assignments) setAssignments(saved.assignments);
    if (saved.generated) setGenerated(saved.generated);
  };
  const saveSetup = async () => {
    const draft = writeSetupDraft();
    if (!schoolId) return false;
    const response = await fetch(
      `${API_URL}/api/v1/schools/${schoolId}/setup`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(draft.data),
      },
    );
    if (response.ok) markSetupDraftSynced(draft.savedAt);
    return response.ok;
  };
  const saveSetupInBackground = () => {
    saveSetup()
      .then((saved) => {
        if (!saved) notify("Changes are saved locally. Backend sync is offline.");
      })
      .catch(() =>
        notify("Changes are saved locally. Backend sync is offline."),
      );
  };
  useEffect(() => {
    if (!schoolId) return;
    const draft = readSetupDraft();
    fetch(`${API_URL}/api/v1/schools/${schoolId}`, { headers: authHeaders() })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const hasUnsyncedDraft =
          draft?.data && draft.savedAt > (draft.syncedAt || 0);
        applySetupData(hasUnsyncedDraft ? draft.data : data || draft?.data);
      })
      .catch(() => {
        applySetupData(draft?.data);
      })
      .finally(() => setHydrated(true));
  }, [schoolId]);
  useEffect(() => {
    setClassPeriods((current) => {
      const next = Object.fromEntries(
        classes.map((name) => [
          name,
          Math.max(1, Number(current[name] || periods || 1)),
        ]),
      );
      const same =
        Object.keys(current).length === Object.keys(next).length &&
        Object.entries(next).every(([name, value]) => current[name] === value);
      return same ? current : next;
    });
  }, [classes, periods]);
  useEffect(() => {
    if (!hydrated || !schoolId) return undefined;
    const timer = window.setTimeout(() => saveSetup(), 500);
    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    schoolId,
    school,
    classes,
    sections,
    days,
    periods,
    classPeriods,
    subjects,
    frequencies,
    teachers,
    assignments,
    generated,
  ]);
  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const saved = await saveSetup();
      if (!saved) {
        notify("Start the backend with python run.py first");
        return;
      }
      const response = await fetch(
        `${API_URL}/api/v1/schools/${schoolId}/generate`,
        { method: "POST", headers: authHeaders() },
      );
      const result = await response.json();
      setGenerated(result);
      notify(
        result.status === "INFEASIBLE"
          ? "Fix the setup blockers before generating"
          : `Generated ${result.entries.length} timetable periods`,
      );
    } catch {
      notify("Backend is offline — run python run.py");
    } finally {
      setGenerating(false);
    }
  };
  const toggleClass = (name) => {
    if (classes.includes(name)) {
      setClasses(classes.filter((item) => item !== name));
      setSections(
        Object.fromEntries(
          Object.entries(sections).filter(([className]) => className !== name),
        ),
      );
    } else {
      setClasses([...classes, name]);
      setSections({ ...sections, [name]: ["A"] });
    }
  };
  const addCustomClass = () => {
    const value = customClass.trim();
    if (!value || classes.includes(value)) return;
    setClasses([...classes, value]);
    setSections({ ...sections, [value]: ["A"] });
    setCustomClass("");
  };
  const removeClass = (name) => {
    setClasses(classes.filter((item) => item !== name));
    setSections(
      Object.fromEntries(
        Object.entries(sections).filter(([className]) => className !== name),
      ),
    );
    setFrequencies(
      Object.fromEntries(
        Object.entries(frequencies).filter(([className]) => className !== name),
      ),
    );
    setAssignments(
      assignments.filter(
        (item) =>
          item.className !== name &&
          !item.className?.startsWith(`${name} ·`),
      ),
    );
  };
  const addSection = (className) =>
    setSections({
      ...sections,
      [className]: [
        ...(sections[className] || []),
        String.fromCharCode(65 + (sections[className]?.length || 0)),
      ],
    });
  const removeSection = (className, section) => {
    const current = sections[className] || [];
    if (current.length <= 1) return;
    setSections({
      ...sections,
      [className]: current.filter((item) => item !== section),
    });
  };
  const updateSection = (className, oldName, nextName) => {
    const value = nextName.trim();
    const current = sections[className] || [];
    if (!value || (value !== oldName && current.includes(value))) return false;
    setSections({
      ...sections,
      [className]: current.map((item) => (item === oldName ? value : item)),
    });
    return true;
  };
  const updateFrequency = (className, subject, delta) => {
    const row = frequencies[className] || {};
    setFrequencies({
      ...frequencies,
      [className]: {
        ...row,
        [subject]: Math.max(0, (row[subject] || 0) + delta),
      },
    });
  };
  const applyFrequencyPatternToAll = (sourceClass) => {
    if (!sourceClass || !classes.length) return;
    const sourceRow = frequencies[sourceClass] || {};
    const pattern = Object.fromEntries(
      subjects.map((subject) => [
        subject,
        Math.max(0, Number(sourceRow[subject] || 0)),
      ]),
    );
    setFrequencies(
      Object.fromEntries(
        classes.map((className) => [className, { ...pattern }]),
      ),
    );
    notify(`${sourceClass} subject periods applied to every class`);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep((current) => Math.min(current + 1, steps.length - 1));
      saveSetupInBackground();
      return;
    }
    generate();
  };
  const previous = () => setStep(Math.max(0, step - 1));

  return (
    <div className="app-shell">
      <Sidebar step={step} setStep={setStep} page={page} setPage={setPage} />
      <main className="main-shell">
        <Topbar school={school} session={session} />
        <div className="page-wrap">
          {page === "view" ? (
            <TimetableView
              generated={generated}
              classes={classes}
              school={school}
              onGenerate={() => {
                setPage("setup");
                setStep(5);
              }}
            />
          ) : null}
          {page !== "view" && (step === -1 ? (
            <DashboardStep
              school={school}
              classes={classes}
              totalSections={totalSections}
              subjects={subjects}
              teachers={teachers}
              assignments={assignments}
              blockers={blockers}
              generated={generated}
              onSetup={() => setStep(0)}
            />
          ) : (
            <>
              <div className="eyebrow">
                <Sparkles size={14} /> SETUP WORKSPACE
              </div>
              <div className="page-heading-row">
                <div>
                  <h1>Build your timetable, calmly.</h1>
                  <p>
                    Set up the essentials once. Schedulo will keep every class,
                    teacher, and room in sync.
                  </p>
                </div>
              </div>
              <Stepper step={step} setStep={setStep} />
              <section className="step-content">
                {step === 0 && (
                  <SchoolStep school={school} setSchool={setSchool} />
                )}
                {step === 1 && (
                  <ClassesStep
                    classes={classes}
                    sections={sections}
                    toggleClass={toggleClass}
                    removeClass={removeClass}
                    addSection={addSection}
                    removeSection={removeSection}
                    updateSection={updateSection}
                    customClass={customClass}
                    setCustomClass={setCustomClass}
                    addCustomClass={addCustomClass}
                    totalSections={totalSections}
                  />
                )}
                {step === 2 && (
                  <PeriodsStep
                    days={days}
                    setDays={setDays}
                    periods={periods}
                    setPeriods={setPeriods}
                    classPeriods={classPeriods}
                    setClassPeriods={setClassPeriods}
                    classes={classes}
                  />
                )}
                {step === 3 && (
                  <SubjectsStep
                    subjects={subjects}
                    setSubjects={setSubjects}
                    classes={classes}
                    frequencies={frequencies}
                    updateFrequency={updateFrequency}
                    applyFrequencyPatternToAll={applyFrequencyPatternToAll}
                    totalFrequency={totalFrequency}
                    days={days}
                    periods={periods}
                    classPeriods={classPeriods}
                  />
                )}
                {step === 4 && (
                  <TeachersStep
                    teachers={teachers}
                    setTeachers={setTeachers}
                    assignments={assignments}
                    setAssignments={setAssignments}
                    subjects={subjects}
                    classes={classes}
                    sections={sections}
                    showAddTeacher={showAddTeacher}
                    setShowAddTeacher={setShowAddTeacher}
                    notify={notify}
                  />
                )}
                {step === 5 && (
                  <ReviewStep
                    school={school}
                    schoolId={schoolId}
                    classes={classes}
                    sections={sections}
                    totalSections={totalSections}
                    days={days}
                    periods={periods}
                    classPeriods={classPeriods}
                    subjects={subjects}
                    frequencies={frequencies}
                    teachers={teachers}
                    assignments={assignments}
                    blockers={blockers}
                    preflight={preflight}
                    setStep={setStep}
                    notify={notify}
                    generated={generated}
                    onGenerate={generate}
                    generating={generating}
                  />
                )}
              </section>
              <div className="wizard-footer">
                <button
                  className="ghost-button"
                  onClick={previous}
                  disabled={step === 0}
                >
                  <ArrowLeft size={17} /> Back
                </button>
                <div className="footer-note">
                  {step === 5
                    ? "Review the setup before generating"
                    : "You can return and edit this step later"}
                </div>
                <button
                  className="primary-button"
                  onClick={next}
                  disabled={step === 5 && generating}
                >
                  {step === 5
                    ? generating
                      ? "Generating..."
                      : "Save & generate"
                    : "Continue"}{" "}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          ))}
        </div>
      </main>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} /> {toast}
        </div>
      )}
    </div>
  );
}

function DashboardStep({
  school,
  classes,
  totalSections,
  subjects,
  teachers,
  assignments,
  blockers,
  generated,
  onSetup,
}) {
  const metrics = [
    { label: "Classes", value: classes.length, icon: GraduationCap },
    { label: "Sections", value: totalSections, icon: LayoutDashboard },
    { label: "Subjects", value: subjects.length, icon: BookOpen },
    { label: "Teachers", value: teachers.length, icon: Users },
  ];
  return (
    <div className="dashboard-view">
      <div className="eyebrow">
        <LayoutDashboard size={14} /> OVERVIEW
      </div>
      <div className="page-heading-row">
        <div>
          <h1>Welcome to {school.name || "your workspace"}.</h1>
          <p>
            Track setup progress and jump back into timetable planning whenever
            you’re ready.
          </p>
        </div>
        <button className="primary-button" onClick={onSetup}>
          <WandSparkles size={16} /> Open setup wizard
        </button>
      </div>
      <div className="dashboard-metrics">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div className="dashboard-metric" key={label}>
            <div className="card-icon blue">
              <Icon size={18} />
            </div>
            <div>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card
          icon={WandSparkles}
          title="Setup progress"
          description="Complete the essentials before generating your first timetable."
          accent={blockers ? "yellow" : "green"}
        >
          <div className="progress-track">
            <span
              style={{
                width: `${Math.min(100, Math.round((((classes.length > 0) + (subjects.length > 0) + (teachers.length > 0) + (assignments.length > 0)) / 4) * 100))}%`,
              }}
            />
          </div>
          <p className="dashboard-note">
            {blockers
              ? `${blockers} coverage items still need attention.`
              : "Your setup is ready for timetable generation."}
          </p>
          <button className="secondary-button" onClick={onSetup}>
            Review setup <ArrowRight size={15} />
          </button>
        </Card>
        <Card
          icon={CalendarDays}
          title="Timetable status"
          description="Your generated timetable will appear here once the solver runs."
          accent="blue"
        >
          {generated?.entries?.length ? (
            <div className="dashboard-status ready">
              <CheckCircle2 size={18} />
              <div>
                <strong>{generated.entries.length} periods generated</strong>
                <small>Open the Review step to inspect the result.</small>
              </div>
            </div>
          ) : (
            <div className="dashboard-status">
              <Clock3 size={18} />
              <div>
                <strong>No timetable generated yet</strong>
                <small>Finish setup and run the scheduler when ready.</small>
              </div>
            </div>
          )}
          <button className="secondary-button" onClick={onSetup}>
            Continue planning <ArrowRight size={15} />
          </button>
        </Card>
      </div>
    </div>
  );
}

function Sidebar({ step, setStep, page, setPage }) {
  const nav = [
    { label: "Dashboard", icon: LayoutDashboard, group: "Overview", step: -1 },
    { label: "Setup wizard", icon: WandSparkles, group: "Setup", step: 0 },
    { label: "Classes", icon: GraduationCap, group: "Setup", step: 1 },
    { label: "Teachers", icon: Users, group: "Setup", step: 4 },
    { label: "Subjects", icon: BookOpen, group: "Setup", step: 3 },
    { label: "Generate timetable", icon: Sparkles, group: "Schedule", step: 5 },
    { label: "View timetable", icon: CalendarDays, group: "Schedule", step: 5 },
    { label: "Adjustments", icon: SlidersHorizontal, group: "Schedule" },
    {
      label: "Absences & substitutes",
      icon: Clock3,
      group: "Daily operations",
    },
    { label: "Teacher workload", icon: Settings2, group: "Insights" },
    { label: "Settings", icon: Settings2, group: "Account" },
  ];
  let lastGroup = "";
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <CalendarDays size={23} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-name">Schedulo</div>
          <div className="brand-sub">SMART SCHEDULING</div>
        </div>
      </div>
      <nav>
        {nav.map((item) => {
          const showGroup = item.group !== lastGroup;
          lastGroup = item.group;
          const Icon = item.icon;
          const active = item.label === "View timetable" ? page === "view" : page !== "view" && item.step === step;
          return (
            <React.Fragment key={item.label}>
              {showGroup && <div className="nav-group">{item.group}</div>}
              <button
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => {
                  if (item.label === "View timetable") {
                    setPage("view");
                    return;
                  }
                  setPage("setup");
                  if (item.step !== undefined) setStep(item.step);
                }}
              >
                <Icon size={18} /> <span>{item.label}</span>
                {item.label === "Absences & substitutes" && (
                  <span className="nav-badge">2</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
}

function Topbar({ school, session }) {
  const [open, setOpen] = useState(false);
  const user = session?.user || {};
  const displayName = user.full_name || user.email || "Account";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const signOut = () => {
    clearToken();
    window.location.href = "/login";
  };
  return (
    <header className="topbar">
      <div className="school-context">
        <div className="school-icon">
          <Building2 size={17} />
        </div>
        <div>
          <strong>{school.name || "Your organization"}</strong>
          <span>{school.year || "Academic year not set"}</span>
        </div>
      </div>
      <div className="top-actions">
        <div className="profile-menu">
          <button
            className="profile-trigger"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <div className="avatar">{initials}</div>
            <ChevronDown
              size={15}
              className={open ? "profile-chevron open" : "profile-chevron"}
            />
          </button>
          {open && (
            <div className="profile-dropdown">
              <strong>{displayName}</strong>
              <small>{user.email || "Signed in account"}</small>
              <div className="profile-divider" />
              <button onClick={signOut}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Stepper({ step, setStep }) {
  return (
    <div className="stepper">
      {steps.map((label, index) => (
        <React.Fragment key={label}>
          <button
            className={`step-chip ${index === step ? "current" : ""} ${index < step ? "complete" : ""}`}
            onClick={() => setStep(index)}
          >
            <span>{index < step ? <Check size={14} /> : index + 1}</span>
            {label}
          </button>
          {index < steps.length - 1 && (
            <div className={`step-line ${index < step ? "complete" : ""}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  accent = "blue",
  children,
  className = "",
}) {
  return (
    <div className={`card ${className}`}>
      <div className="card-title-row">
        <div className={`card-icon ${accent}`}>
          <Icon size={20} />
        </div>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SchoolStep({ school, setSchool }) {
  return (
    <div className="stack">
      <Card
        icon={Building2}
        title="School information"
        description="The basics. You can refine these later from Settings."
        accent="blue"
      >
        <div className="form-grid">
          <label>
            School name
            <input
              value={school.name}
              onChange={(e) => setSchool({ ...school, name: e.target.value })}
            />
          </label>
          <label>
            Academic year
            <input
              value={school.year}
              onChange={(e) => setSchool({ ...school, year: e.target.value })}
            />
          </label>
        </div>
        <div className="hint-box">
          <Sparkles size={17} />
          <div>
            <strong>Start with the essentials</strong>
            <span>
              Schedulo saves your progress as you go. Nothing becomes final
              until you publish.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ClassesStep({
  classes,
  sections,
  toggleClass,
  removeClass,
  addSection,
  removeSection,
  updateSection,
  customClass,
  setCustomClass,
  addCustomClass,
  totalSections,
}) {
  const [editingSection, setEditingSection] = useState(null);
  const [sectionDraft, setSectionDraft] = useState("");
  const orderedClasses = sortClasses(classes);
  const beginSectionEdit = (className, section) => {
    setEditingSection(`${className}:${section}`);
    setSectionDraft(section);
  };
  const finishSectionEdit = (className, section) => {
    if (updateSection(className, section, sectionDraft)) setEditingSection(null);
  };
  return (
    <div className="stack">
      <Card
        icon={GraduationCap}
        title="Classes & sections"
        description="Add the grades you teach. Each class starts with Section A."
        accent="coral"
      >
        <div className="stat-inline">
          <span>
            <strong>{classes.length}</strong> classes
          </span>
          <span>
            <strong>{totalSections}</strong> sections
          </span>
        </div>
        <div className="mini-label">QUICK ADD</div>
        <div className="chip-wrap">
          {quickClasses.map((name) => (
            <button
              key={name}
              className={`choice-chip ${classes.includes(name) ? "selected" : ""}`}
              onClick={() => toggleClass(name)}
            >
              {classes.includes(name) ? (
                <Check size={14} />
              ) : (
                <Plus size={14} />
              )}
              {name}
            </button>
          ))}
        </div>
        <div className="mini-label">OR ADD CUSTOM</div>
        <div className="inline-input">
          <input
            value={customClass}
            onChange={(e) => setCustomClass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomClass()}
            placeholder="e.g. Pre-Primary, Class 11 Commerce"
          />
          <button className="secondary-button" onClick={addCustomClass}>
            <Plus size={16} /> Add
          </button>
        </div>
      </Card>
      <Card
        icon={GraduationCap}
        title="Sections"
        description="Add parallel sections where a grade has more than one class."
        accent="yellow"
      >
        <div className="list-card">
          {orderedClasses.map((name) => (
            <div className="list-row" key={name}>
              <div>
                <strong>{name}</strong>
                <small>
                  {sections[name]?.length || 0} section
                  {sections[name]?.length === 1 ? "" : "s"}
                </small>
              </div>
              <div className="section-pills">
                {(sections[name] || []).map((section) => (
                  <span key={section}>
                    {editingSection === `${name}:${section}` ? (
                      <input
                        className="section-name-input"
                        value={sectionDraft}
                        autoFocus
                        onChange={(e) => setSectionDraft(e.target.value)}
                        onBlur={() => finishSectionEdit(name, section)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") finishSectionEdit(name, section);
                          if (e.key === "Escape") setEditingSection(null);
                        }}
                        aria-label={`Rename section ${section}`}
                      />
                    ) : (
                      <button
                        type="button"
                        className="section-name"
                        onClick={() => beginSectionEdit(name, section)}
                        title="Rename section"
                      >
                        {section}
                        <Pencil size={10} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSection(name, section)}
                      disabled={sections[name]?.length <= 1}
                      aria-label={`Remove section ${section} from ${name}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <button className="add-inline" onClick={() => addSection(name)}>
                  <Plus size={14} /> Section
                </button>
              </div>
              <button
                type="button"
                className="muted-action"
                onClick={() => removeClass(name)}
                aria-label={`Delete ${name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PeriodsStep({
  days,
  setDays,
  periods,
  setPeriods,
  classPeriods,
  setClassPeriods,
  classes,
}) {
  const bulkPeriods = Math.max(1, Number(periods || 1));
  const periodForClass = (name) =>
    Math.max(1, Number(classPeriods[name] || bulkPeriods));
  const updateClassPeriods = (name, delta) => {
    setClassPeriods({
      ...classPeriods,
      [name]: Math.max(1, periodForClass(name) + delta),
    });
  };
  const applyPeriodsToAll = () => {
    setClassPeriods(
      Object.fromEntries(classes.map((name) => [name, bulkPeriods])),
    );
  };
  return (
    <div className="stack">
      <Card
        icon={CalendarDays}
        title="Working days"
        description="Most schools run Monday–Friday; Saturday can be added for a six-day week."
        accent="blue"
      >
        <div className="segmented">
          <button
            className={days === 5 ? "selected" : ""}
            onClick={() => setDays(5)}
          >
            5-day week <small>Mon–Fri</small>
          </button>
          <button
            className={days === 6 ? "selected" : ""}
            onClick={() => setDays(6)}
          >
            6-day week <small>Mon–Sat</small>
          </button>
        </div>
        <div className="day-row">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
            <span className={i < days ? "on" : ""} key={day}>
              {day}
            </span>
          ))}
        </div>
      </Card>
      <Card
        icon={Clock3}
        title="Periods per class"
        description="Set the regular teaching periods. You can fine-tune individual classes later."
        accent="coral"
      >
        <div className="bulk-control">
          <span>
            <small>BULK APPLY</small>
            <strong>Regular periods</strong>
          </span>
          <div className="stepper-control">
            <button onClick={() => setPeriods(Math.max(1, bulkPeriods - 1))}>
              −
            </button>
            <b>{bulkPeriods}</b>
            <button onClick={() => setPeriods(bulkPeriods + 1)}>+</button>
          </div>
          <button className="secondary-button" onClick={applyPeriodsToAll}>
            Apply to all
          </button>
        </div>
        <div className="class-period-list">
          {classes.map((name) => (
            <div key={name}>
              <span>{name}</span>
              <div className="stepper-control compact">
                <button onClick={() => updateClassPeriods(name, -1)}>−</button>
                <b>{periodForClass(name)}</b>
                <button onClick={() => updateClassPeriods(name, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SubjectsStep({
  subjects,
  setSubjects,
  classes,
  frequencies,
  updateFrequency,
  applyFrequencyPatternToAll,
  totalFrequency,
  days,
  periods,
  classPeriods,
}) {
  const [newSubject, setNewSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState(classes[0]);
  useEffect(() => {
    if (!classes.length) {
      setSelectedClass("");
      return;
    }
    if (!selectedClass || !classes.includes(selectedClass)) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);
  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject("");
    }
  };
  const addCommonSubject = (subject) => {
    if (!subjects.includes(subject)) setSubjects([...subjects, subject]);
  };
  const capacity = selectedClass
    ? days * classDailyPeriods(classPeriods, periods, selectedClass, classes)
    : 0;
  const totalForClass = Object.values(frequencies[selectedClass] || {}).reduce(
    (a, b) => a + b,
    0,
  );
  return (
    <div className="stack">
      <Card
        icon={BookOpen}
        title="Subject library"
        description="Keep one master list. Subject colors stay consistent across every timetable view."
        accent="blue"
      >
        <div className="mini-label subject-quick-label">COMMON SUBJECTS</div>
        <div className="common-subjects">
          {commonSubjects.map((subject) => (
            <button
              type="button"
              className={`common-subject ${subjects.includes(subject) ? "selected" : ""}`}
              key={subject}
              onClick={() => addCommonSubject(subject)}
            >
              {subjects.includes(subject) ? <CheckCircle2 size={13} /> : <Plus size={13} />}
              {subject}
            </button>
          ))}
        </div>
        <div className="mini-label subject-custom-label">OR ADD CUSTOM</div>
        <div className="inline-input">
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubject()}
            placeholder="e.g. Robotics, Music"
          />
          <button className="secondary-button" onClick={addSubject}>
            <Plus size={16} /> Add subject
          </button>
        </div>
        <div className="subject-grid">
          {subjects.map((subject) => (
            <div className="subject-card" key={subject}>
              <span
                className="subject-swatch"
                style={{ background: subjectColors[subject] || "#6b7fc1" }}
              >
                {subject[0]}
              </span>
              <div>
                <strong>{subject}</strong>
                <small>
                  {subject === "English" || subject === "Mathematics"
                    ? "Core subject"
                    : "Available to assign"}
                </small>
              </div>
              <button
                onClick={() =>
                  setSubjects(subjects.filter((item) => item !== subject))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </Card>
      <Card
        icon={SlidersHorizontal}
        title="Frequency by class"
        description="How many periods per week should each subject run in each class?"
        accent="yellow"
      >
        <div className="class-tabs">
          {classes.map((name) => {
            const total = Object.values(frequencies[name] || {}).reduce(
              (a, b) => a + b,
              0,
            );
            const classCapacity =
              days * classDailyPeriods(classPeriods, periods, name, classes);
            return (
              <button
                className={selectedClass === name ? "active" : ""}
                key={name}
                onClick={() => setSelectedClass(name)}
              >
                {name}
                <small>
                  {total}/{classCapacity}
                </small>
              </button>
            );
          })}
        </div>
        <div className="coverage-line">
          <span>{selectedClass || "Select a class"}</span>
          <div className="frequency-actions">
            <button
              className="secondary-button small"
              onClick={() => applyFrequencyPatternToAll(selectedClass)}
              disabled={!selectedClass || classes.length < 2 || !subjects.length}
            >
              <WandSparkles size={14} /> Apply to all classes
            </button>
            <b>
              {totalForClass} / {capacity} periods per week
            </b>
          </div>
        </div>
        <div className="frequency-list">
          {subjects.map((subject) => (
            <div key={subject}>
              <span>
                <i
                  style={{ background: subjectColors[subject] || "#6b7fc1" }}
                />
                {subject}
              </span>
              <div className="stepper-control compact">
                <button
                  onClick={() => updateFrequency(selectedClass, subject, -1)}
                  disabled={!selectedClass || totalForClass <= 0}
                >
                  −
                </button>
                <b>{frequencies[selectedClass]?.[subject] || 0}</b>
                <button
                  onClick={() => updateFrequency(selectedClass, subject, 1)}
                  disabled={!selectedClass || totalForClass >= capacity}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TeachersStep({
  teachers,
  setTeachers,
  assignments,
  setAssignments,
  subjects,
  classes,
  sections,
  showAddTeacher,
  setShowAddTeacher,
  notify,
}) {
  const classOptions = classes.flatMap((name) =>
    (sections[name] || ["A"]).map((section) => `${name} ${section}`),
  );
  const firstClassOption = classOptions[0] || "";
  const [draft, setDraft] = useState({ name: "", email: "" });
  const [editing, setEditing] = useState(null);
  const [teacherEditorMessage, setTeacherEditorMessage] = useState("");
  const [expandedTeacher, setExpandedTeacher] = useState(null);
  const defaultAssignmentDraft = () => ({
    subject: subjects[0] || "",
    className: firstClassOption,
    periods: 3,
  });
  const [assignmentDraft, setAssignmentDraft] = useState(defaultAssignmentDraft);
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState(null);
  const resetAssignmentDraft = () => {
    setAssignmentDraft(defaultAssignmentDraft());
    setEditingAssignmentIndex(null);
  };
  const closeTeacherEditor = () => {
    setEditing(null);
    setShowAddTeacher(false);
    setDraft({ name: "", email: "" });
    setTeacherEditorMessage("");
  };
  const addTeacher = () => {
    if (!draft.name.trim()) {
      setTeacherEditorMessage("Teacher name is required.");
      return;
    }
    setTeachers([
      ...teachers,
      {
        ...draft,
        initials: draft.name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        assignments: 0,
      },
    ]);
    closeTeacherEditor();
  };
  const startEdit = (teacher) => {
    setShowAddTeacher(false);
    setTeacherEditorMessage("");
    setEditing(teacher.name);
    setDraft({ name: teacher.name, email: teacher.email || "" });
  };
  const saveEdit = () => {
    if (!editing) return;
    if (!draft.name.trim()) {
      setTeacherEditorMessage("Teacher name is required.");
      return;
    }
    const nextName = draft.name.trim();
    setTeachers(
      teachers.map((teacher) =>
        teacher.name === editing
          ? {
              ...teacher,
              name: nextName,
              email: draft.email,
              initials: nextName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase(),
            }
          : teacher,
      ),
    );
    setAssignments(
      assignments.map((item) =>
        item.teacher === editing ? { ...item, teacher: nextName } : item,
      ),
    );
    closeTeacherEditor();
  };
  const deleteTeacher = (teacher) => {
    if (
      !window.confirm(
        `Delete ${teacher.name}? Their assignments will also be removed.`,
      )
    )
      return;
    setTeachers(teachers.filter((item) => item !== teacher));
    setAssignments(assignments.filter((item) => item.teacher !== teacher.name));
    notify("Teacher deleted");
  };
  const addTeacherAssignment = (teacher) => {
    if (!assignmentDraft.subject || !assignmentDraft.className) return;
    const duplicate = assignments.some(
      (item, index) =>
        index !== editingAssignmentIndex &&
        item.teacher === teacher.name &&
        item.subject === assignmentDraft.subject &&
        item.className === assignmentDraft.className,
    );
    if (duplicate) return notify("This assignment already exists");
    const nextAssignment = {
      teacher: teacher.name,
      subject: assignmentDraft.subject,
      className: assignmentDraft.className,
      periods: Math.max(1, Number(assignmentDraft.periods) || 1),
    };
    if (editingAssignmentIndex !== null) {
      setAssignments(
        assignments.map((item, index) =>
          index === editingAssignmentIndex ? nextAssignment : item,
        ),
      );
      resetAssignmentDraft();
      notify("Teaching assignment updated");
      return;
    }
    setAssignments([...assignments, nextAssignment]);
    resetAssignmentDraft();
    notify("Teaching assignment added");
  };
  return (
    <div className="stack">
      <div className="summary-strip">
        <Metric label="Teachers" value={teachers.length} icon={Users} />
        <Metric label="Class teachers" value="0" icon={GraduationCap} />
        <Metric
          label="Assignments"
          value={assignments.length}
          icon={BookOpen}
        />
        <Metric
          label="Periods / week"
          value={assignments.reduce((sum, item) => sum + item.periods, 0)}
          icon={Clock3}
        />
      </div>
      <Card
        icon={Users}
        title="Teaching team"
        description="Add staff and the subjects/classes they teach."
        accent="blue"
        className="teaching-card"
      >
        <div className="card-actions">
          <button
            className="secondary-button"
            onClick={() => {
              setEditing(null);
              setTeacherEditorMessage("");
              setDraft({ name: "", email: "" });
              setShowAddTeacher(true);
            }}
          >
            <Plus size={16} /> Add teacher
          </button>
        </div>
        {(showAddTeacher || editing) && (
          <div className="teacher-editor-popover">
            <div className="teacher-editor-head">
              <div>
                <h3>{editing ? "Edit teacher" : "Add teacher"}</h3>
                <p>
                  {editing
                    ? "Update details here. The list behind stays steady."
                    : "Add the teacher, then assign subjects from their row."}
                </p>
              </div>
              <button className="icon-button" onClick={closeTeacherEditor}>
                <X size={17} />
              </button>
            </div>
            <div className="teacher-editor-form">
              <input
                autoFocus
                placeholder="Teacher name"
                value={draft.name}
                onChange={(e) => {
                  setTeacherEditorMessage("");
                  setDraft({ ...draft, name: e.target.value });
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && (editing ? saveEdit() : addTeacher())
                }
              />
              <input
                placeholder="Email (optional)"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                onKeyDown={(e) =>
                  e.key === "Enter" && (editing ? saveEdit() : addTeacher())
                }
              />
              {teacherEditorMessage && (
                <div className="teacher-editor-message">
                  {teacherEditorMessage}
                </div>
              )}
              <div className="teacher-editor-actions">
                <button className="ghost-button small" onClick={closeTeacherEditor}>
                  Cancel
                </button>
                {editing ? (
                  <button className="primary-button small" onClick={saveEdit}>
                    Save changes
                  </button>
                ) : (
                  <button className="primary-button small" onClick={addTeacher}>
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="search-row">
          <input placeholder="Search by name or email" />
          <div className="filter-pills">
            <button className="active">All</button>
            <button>Class teachers</button>
            <button>Coordinators</button>
          </div>
        </div>
        <div className="teacher-list">
          {teachers.map((teacher) => (
            <React.Fragment key={teacher.email || teacher.name}>
            <div className="teacher-row">
              <div className="teacher-avatar">{teacher.initials}</div>
              <button
                type="button"
                className="teacher-info teacher-expand-trigger"
                onClick={() => {
                  setExpandedTeacher(expandedTeacher === teacher.name ? null : teacher.name);
                  resetAssignmentDraft();
                }}
              >
                <strong>{teacher.name}</strong>
                <small>{teacher.email || "No email added"}</small>
              </button>
              <span className="teacher-periods">
                {assignments.filter((item) => item.teacher === teacher.name).length} assignments
              </span>
              <button
                className="ghost-button small teacher-add-assignment"
                onClick={() => {
                  if (expandedTeacher === teacher.name) {
                    setExpandedTeacher(null);
                    resetAssignmentDraft();
                    return;
                  }
                  setExpandedTeacher(teacher.name);
                  resetAssignmentDraft();
                }}
              >
                {expandedTeacher === teacher.name ? (
                  <X size={13} />
                ) : (
                  <Plus size={13} />
                )}
                {expandedTeacher === teacher.name
                  ? "Hide details"
                  : "Add subject/class"}
              </button>
              <button
                className="icon-button"
                title="Edit teacher"
                onClick={() => startEdit(teacher)}
              >
                <Settings2 size={16} />
              </button>
              <button
                className="icon-button"
                title="Delete teacher"
                onClick={() => deleteTeacher(teacher)}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {expandedTeacher === teacher.name && (
              <div className="teacher-assignment-panel">
                <div className="teacher-panel-head">
                  <div>
                    <div className="mini-label">ADD SUBJECT / CLASS</div>
                    <small>Only this teacher’s assignments are expanded.</small>
                  </div>
                  <button
                    className="ghost-button small"
                    onClick={() => {
                      setExpandedTeacher(null);
                      resetAssignmentDraft();
                    }}
                  >
                    Done
                  </button>
                </div>
                <div className="teacher-assignment-form">
                  <select
                    value={assignmentDraft.subject}
                    onChange={(e) => setAssignmentDraft({ ...assignmentDraft, subject: e.target.value })}
                  >
                    <option value="">Select subject</option>
                    {subjects.map((subject) => <option key={subject}>{subject}</option>)}
                  </select>
                  <select
                    value={assignmentDraft.className}
                    onChange={(e) => setAssignmentDraft({ ...assignmentDraft, className: e.target.value })}
                  >
                    <option value="">Select class</option>
                    {classOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={assignmentDraft.periods}
                    onChange={(e) => setAssignmentDraft({ ...assignmentDraft, periods: e.target.value })}
                    aria-label="Periods per week"
                  />
                  <button
                    className="primary-button small"
                    onClick={() => addTeacherAssignment(teacher)}
                  >
                    {editingAssignmentIndex !== null ? (
                      <Check size={14} />
                    ) : (
                      <Plus size={14} />
                    )}
                    {editingAssignmentIndex !== null ? "Update" : "Add"}
                  </button>
                  {editingAssignmentIndex !== null && (
                    <button
                      className="ghost-button small"
                      onClick={resetAssignmentDraft}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
                {assignments
                  .map((item, assignmentIndex) => ({ item, assignmentIndex }))
                  .filter(({ item }) => item.teacher === teacher.name)
                  .map(({ item, assignmentIndex }) => (
                  <div
                    className={`teacher-assignment-row ${editingAssignmentIndex === assignmentIndex ? "editing" : ""}`}
                    key={`${item.subject}-${item.className}-${assignmentIndex}`}
                  >
                    <span>{item.subject}</span><small>{item.className} · {item.periods}/wk</small>
                    <button
                      className="icon-button"
                      title="Edit assignment"
                      onClick={() => {
                        setEditingAssignmentIndex(assignmentIndex);
                        setAssignmentDraft({
                          subject: item.subject,
                          className: item.className,
                          periods: item.periods,
                        });
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-button"
                      title="Delete assignment"
                      onClick={() => {
                        setAssignments(
                          assignments.filter(
                            (_, index) => index !== assignmentIndex,
                          ),
                        );
                        resetAssignmentDraft();
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            </React.Fragment>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AssignmentsStep({
  assignments,
  setAssignments,
  teachers,
  subjects,
  classes,
  notify,
}) {
  const [form, setForm] = useState({
    teacher: teachers[0]?.name || "",
    subject: subjects[0] || "",
    className: `${classes[0] || "Class"} A`,
    periods: 3,
  });
  const addAssignment = () => {
    setAssignments([
      ...assignments,
      { ...form, periods: Number(form.periods) },
    ]);
    notify("Teaching assignment added");
  };
  return (
    <div className="stack">
      <Card
        icon={SlidersHorizontal}
        title="Teaching assignments"
        description="Connect each teacher, subject, class, and weekly period requirement."
        accent="coral"
      >
        <div className="assignment-form">
          <label>
            Teacher
            <select
              value={form.teacher}
              onChange={(e) => setForm({ ...form, teacher: e.target.value })}
            >
              {teachers.map((teacher) => (
                <option key={teacher.name}>{teacher.name}</option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            >
              {subjects.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
          </label>
          <label>
            Class
            <select
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
            >
              {classes.map((name) => (
                <option key={name}>{name} A</option>
              ))}
            </select>
          </label>
          <label>
            Periods / week
            <input
              type="number"
              min="1"
              max="12"
              value={form.periods}
              onChange={(e) => setForm({ ...form, periods: e.target.value })}
            />
          </label>
          <button className="primary-button" onClick={addAssignment}>
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="assignment-list">
          {assignments.map((item, index) => (
            <div
              className="assignment-row"
              key={`${item.teacher}-${item.subject}-${index}`}
            >
              <span
                className="subject-swatch tiny"
                style={{ background: subjectColors[item.subject] || "#6b7fc1" }}
              />
              <div>
                <strong>{item.subject}</strong>
                <small>
                  {item.className} · {item.teacher}
                </small>
              </div>
              <b>{item.periods} / wk</b>
              <button
                className="icon-button"
                onClick={() =>
                  setAssignments(assignments.filter((_, i) => i !== index))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </Card>
      <Card
        icon={SlidersHorizontal}
        title="Scheduling rules"
        description="Start with a few powerful rules. Add advanced rules after the first draft."
        accent="yellow"
      >
        <div className="rule-list">
          <label className="toggle-row">
            <span>
              <strong>Spread core subjects</strong>
              <small>Prefer one core subject per day where possible.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Protect teacher breaks</strong>
              <small>Avoid more than three consecutive periods.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Keep double periods together</strong>
              <small>Useful for labs and practical sessions.</small>
            </span>
            <input type="checkbox" />
          </label>
        </div>
      </Card>
    </div>
  );
}

function ReviewStep({
  school,
  schoolId,
  classes,
  sections,
  totalSections,
  days,
  periods,
  classPeriods,
  subjects,
  frequencies = {},
  teachers,
  assignments,
  blockers,
  preflight,
  setStep,
  notify,
  generated,
  onGenerate,
  generating,
}) {
  const maxDailyPeriods = Math.max(
    Number(periods || 0),
    ...classes.map((name) => Number(classPeriods[name] || 0)),
  );
  const classLoads = assignments.reduce((loads, item) => ({ ...loads, [item.className]: (loads[item.className] || 0) + Number(item.periods || 0) }), {});
  const teacherLoads = assignments.reduce((loads, item) => ({ ...loads, [item.teacher]: (loads[item.teacher] || 0) + Number(item.periods || 0) }), {});
  const classSectionNames = classes.flatMap((name) =>
    (sections?.[name]?.length ? sections[name] : ["A"]).map(
      (section) => `${name} ${section}`,
    ),
  );
  const validClassSections = new Set(classSectionNames);
  const validTeachers = new Set(teachers.map((teacher) => teacher.name));
  const validSubjects = new Set(subjects);
  const criticalIssues = [];
  const qualityIssues = [];
  const addCritical = (issue) => criticalIssues.push(issue);
  const addQuality = (issue) => qualityIssues.push(issue);
  if (!classes.length) addCritical({ title: "No classes added", detail: "Add at least one class and section before generating.", step: 1 });
  if (!maxDailyPeriods) addCritical({ title: "Periods per day is missing", detail: "Set the number of teaching periods in the Periods step.", step: 2 });
  if (!subjects.length) addCritical({ title: "No subjects added", detail: "Add the subjects your classes will study.", step: 3 });
  if (!teachers.length) addCritical({ title: "No teachers added", detail: "Add the teachers who will appear in the timetable.", step: 4 });
  if (!assignments.length) addCritical({ title: "No teaching assignments", detail: "Add at least one subject, class, and teacher assignment.", step: 4 });
  Object.entries(classLoads).forEach(([name, load]) => {
    const capacity = days * classDailyPeriods(classPeriods, periods, name, classes);
    if (capacity && load > capacity) addCritical({ title: `${name} has too many periods`, detail: `${load} assigned periods but only ${capacity} slots are available this week.`, step: 4 });
  });
  Object.entries(teacherLoads).forEach(([name, load]) => {
    const capacity = days * maxDailyPeriods;
    if (capacity && load > capacity) addCritical({ title: `${name} is over capacity`, detail: `${load} assigned periods but only ${capacity} teaching slots are available.`, step: 4 });
    else if (capacity && load >= Math.ceil(capacity * 0.9)) addQuality({ kind: "near-capacity", groupKey: `teacher:${name}`, groupTitle: `${name} needs workload review`, title: `${name} has almost no free slots`, detail: `${load} of ${capacity} teaching slots are already assigned, so the generated timetable may have no breathing room.`, step: 4 });
  });
  assignments.forEach((item) => {
    if (Number(item.periods || 0) > days * 2) addCritical({ title: `${item.subject} frequency is too high`, detail: `${item.periods} periods/week exceeds the maximum of ${days * 2} supported for one assignment.`, step: 3 });
    if (item.className && !validClassSections.has(item.className)) addQuality({ kind: "stale-data", groupKey: "cleanup", groupTitle: "Some assignments need cleanup", title: `${item.className} is not an active section`, detail: "This assignment points to a class/section that is no longer in your class list.", step: 4 });
    if (item.teacher && !validTeachers.has(item.teacher)) addQuality({ kind: "stale-data", groupKey: "cleanup", groupTitle: "Some assignments need cleanup", title: `${item.teacher} is not in the teacher list`, detail: "This assignment may appear in the output with a teacher that has been removed.", step: 4 });
    if (item.subject && !validSubjects.has(item.subject)) addQuality({ kind: "stale-data", groupKey: "cleanup", groupTitle: "Some assignments need cleanup", title: `${item.subject} is not in the subject library`, detail: "This assignment may generate, but the subject is no longer managed in your subject list.", step: 3 });
  });
  teachers.forEach((teacher) => {
    if (!teacherLoads[teacher.name]) addQuality({ kind: "unused-teacher", groupKey: `teacher:${teacher.name}`, groupTitle: `${teacher.name} needs workload review`, title: `${teacher.name} has no assignments`, detail: "The timetable can still generate, but this teacher will not appear in it.", step: 4 });
  });
  classSectionNames.forEach((name) => {
    const load = classLoads[name] || 0;
    const capacity = days * classDailyPeriods(classPeriods, periods, name, classes);
    if (!load) addQuality({ kind: "empty-section", groupKey: `class:${name}`, groupTitle: `${name} coverage needs review`, blankSlots: capacity, title: `${name} has no assigned periods`, detail: "The timetable can generate for other sections, but this section will be empty.", step: 4 });
    else if (capacity && load < capacity) addQuality({ kind: "under-filled", groupKey: `class:${name}`, groupTitle: `${name} coverage needs review`, blankSlots: capacity - load, title: `${name} is under-filled`, detail: `${load} of ${capacity} weekly slots are assigned, so the timetable will have blank periods.`, step: 3 });
  });
  classes.forEach((className) => {
    const planned = frequencies[className] || {};
    (sections?.[className]?.length ? sections[className] : ["A"]).forEach((section) => {
      const sectionName = `${className} ${section}`;
      subjects.forEach((subject) => {
        const target = Number(planned[subject] || 0);
        const actual = assignments
          .filter((item) => item.className === sectionName && item.subject === subject)
          .reduce((sum, item) => sum + Number(item.periods || 0), 0);
        if (target > actual) addQuality({ kind: "subject-gap", groupKey: `class:${sectionName}`, groupTitle: `${sectionName} coverage needs review`, title: `${sectionName} is short on ${subject}`, detail: `Subject plan needs ${target}/week, but teachers cover ${actual}/week.`, step: 4 });
        if (actual > target) addQuality({ kind: "subject-extra", groupKey: `class:${sectionName}`, groupTitle: `${sectionName} coverage needs review`, title: `${sectionName} has extra ${subject}`, detail: `Subject plan asks for ${target}/week, but teachers cover ${actual}/week.`, step: 4 });
      });
    });
  });
  const qualityGroups = Object.values(
    qualityIssues.reduce((groups, issue) => {
      const key = issue.groupKey || issue.title;
      groups[key] ||= {
        key,
        title: issue.groupTitle || issue.title,
        step: issue.step,
        items: [],
        counts: {},
        blankSlots: 0,
      };
      groups[key].items.push(issue);
      groups[key].counts[issue.kind || "warning"] =
        (groups[key].counts[issue.kind || "warning"] || 0) + 1;
      groups[key].blankSlots += Number(issue.blankSlots || 0);
      return groups;
    }, {}),
  ).map((group) => {
    const summaryParts = [];
    if (group.counts["empty-section"]) summaryParts.push("No periods assigned");
    if (group.blankSlots) summaryParts.push(`${group.blankSlots} blank slot${group.blankSlots === 1 ? "" : "s"}`);
    if (group.counts["subject-gap"]) summaryParts.push(`${group.counts["subject-gap"]} subject gap${group.counts["subject-gap"] === 1 ? "" : "s"}`);
    if (group.counts["subject-extra"]) summaryParts.push(`${group.counts["subject-extra"]} extra subject load${group.counts["subject-extra"] === 1 ? "" : "s"}`);
    if (group.counts["near-capacity"]) summaryParts.push("Teacher is near full capacity");
    if (group.counts["unused-teacher"]) summaryParts.push("Teacher is unused");
    if (group.counts["stale-data"]) summaryParts.push(`${group.counts["stale-data"]} stale assignment${group.counts["stale-data"] === 1 ? "" : "s"}`);
    return {
      ...group,
      summary: summaryParts.join(" · ") || `${group.items.length} warning${group.items.length === 1 ? "" : "s"} to review`,
    };
  });
  const hasCriticalIssues = criticalIssues.length > 0;
  const hasQualityIssues = qualityGroups.length > 0;
  const hasIssues = hasCriticalIssues || hasQualityIssues;
  const cards = [
    {
      label: "School",
      value: school.name,
      sub: school.year,
      icon: Building2,
      step: 0,
      accent: "blue",
    },
    {
      label: "Classes",
      value: `${classes.length} classes`,
      sub: `${totalSections} sections`,
      icon: GraduationCap,
      step: 1,
      accent: "coral",
    },
    {
      label: "Periods",
      value: classes.length && classes.some((name) => classDailyPeriods(classPeriods, periods, name, classes) !== classDailyPeriods(classPeriods, periods, classes[0], classes)) ? "Mixed periods" : `${maxDailyPeriods} regular`,
      sub: `${days}-day week`,
      icon: Clock3,
      step: 2,
      accent: "yellow",
    },
    {
      label: "Subjects",
      value: `${subjects.length} subjects`,
      sub: "Library ready",
      icon: BookOpen,
      step: 3,
      accent: "blue",
    },
    {
      label: "Teachers",
      value: `${teachers.length} teachers`,
      sub: `${assignments.length} assignments`,
      icon: Users,
      step: 4,
      accent: "coral",
    },
    {
      label: "Coverage",
      value: hasCriticalIssues ? `${criticalIssues.length} blockers` : hasQualityIssues ? `${qualityGroups.length} areas` : "Ready to generate",
      sub: hasCriticalIssues ? "Must fix before generation" : hasQualityIssues ? `${qualityIssues.length} checks grouped` : "All essentials covered",
      icon: hasIssues ? AlertTriangle : CheckCircle2,
      step: 5,
      accent: hasCriticalIssues ? "red" : hasQualityIssues ? "yellow" : "green",
    },
  ];
  return (
    <div className="stack">
      <div className={`review-banner ${hasCriticalIssues ? "critical" : hasQualityIssues ? "warning" : "ready"}`}>
        <div className="review-banner-icon">
          {hasIssues ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
        </div>
        <div>
          <h2>
            {hasCriticalIssues
              ? `${criticalIssues.length} critical blocker${criticalIssues.length === 1 ? "" : "s"} found`
              : hasQualityIssues
                ? `${qualityGroups.length} area${qualityGroups.length === 1 ? " needs" : "s need"} review`
                : "Your setup is ready"}
          </h2>
          <p>
            {hasCriticalIssues
              ? "Fix these first — the timetable cannot be generated reliably with this setup."
              : hasQualityIssues
                ? "You can generate, but these issues may create empty classes, missing subjects, or overloaded teachers."
              : "All essentials are covered. You can generate a first timetable now."}
          </p>
        </div>
      </div>
      <div className="review-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              className="review-card"
              key={card.label}
              onClick={() => setStep(card.step)}
            >
              <div className={`card-icon ${card.accent}`}>
                <Icon size={18} />
              </div>
              <div className="mini-label">{card.label}</div>
              <strong>{card.value}</strong>
              <small>{card.sub}</small>
              <ChevronRight size={16} className="review-arrow" />
            </button>
          );
        })}
      </div>
      <Card
        icon={AlertTriangle}
        title="Pre-flight checks"
        description="Critical blockers stop generation. Quality warnings can still generate but may produce a weak timetable."
        accent={hasCriticalIssues ? "red" : hasQualityIssues ? "yellow" : "green"}
      >
        {hasIssues ? (
          <div className="issue-groups">
            {hasCriticalIssues && (
              <div className="issue-section critical">
                <div className="issue-heading">
                  <span>Critical blockers</span>
                  <b>{criticalIssues.length}</b>
                </div>
                <div className="blocker-list">
                  {criticalIssues.map((issue, index) => (
                    <div className="blocker-item" key={`${issue.title}-${index}`}>
                      <AlertTriangle size={17} />
                      <div><strong>{issue.title}</strong><small>{issue.detail}</small></div>
                      <button className="ghost-button small" onClick={() => setStep(issue.step)}>Fix</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hasQualityIssues && (
              <div className="issue-section warning">
                <div className="issue-heading">
                  <span>Quality warnings</span>
                  <b>{qualityGroups.length} groups</b>
                </div>
                <div className="warning-group-list">
                  {qualityGroups.map((group) => (
                    <details className="warning-group-card" key={group.key}>
                      <summary>
                        <AlertTriangle size={17} />
                        <span>
                          <strong>{group.title}</strong>
                          <small>{group.summary}</small>
                        </span>
                        <em>{group.items.length} check{group.items.length === 1 ? "" : "s"}</em>
                      </summary>
                      <div className="warning-detail-list">
                        {group.items.map((issue, index) => (
                          <div className="warning-detail-row" key={`${issue.title}-${index}`}>
                            <span>{issue.title}</span>
                            <small>{issue.detail}</small>
                          </div>
                        ))}
                        <button className="ghost-button small" onClick={() => setStep(group.step)}>Review related step</button>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="all-clear"><CheckCircle2 size={17} /><strong>Everything required is ready.</strong><span>Schedulo can generate a timetable without any known setup blockers.</span></div>
        )}
        <button
          className="primary-button generate-button"
          onClick={onGenerate}
          disabled={generating || hasCriticalIssues}
        >
          <Sparkles size={17} /> {generating ? "Generating..." : hasCriticalIssues ? "Fix critical blockers first" : "Generate timetable"}
        </button>
        {generated && (
          <div
            className={`generation-result ${generated.status === "INFEASIBLE" ? "failed" : ""}`}
          >
            <strong>
              {generated.status === "INFEASIBLE"
                ? "Generation needs attention"
                : `Generated ${generated.entries.length} periods`}
            </strong>
            <span>
              {generated.status === "INFEASIBLE"
                ? generated.diagnostics?.[0]
                : `Solver finished in ${generated.solveSeconds || "—"} seconds.`}
            </span>
          </div>
        )}
      </Card>
      {generated?.entries?.length > 0 && (
        <SchedulePreview entries={generated.entries} />
      )}
    </div>
  );
}

function TimetableView({ generated, classes, school, onGenerate }) {
  return (
    <div className="stack timetable-view">
      <div className="eyebrow"><CalendarDays size={14} /> VIEW TIMETABLE</div>
      <div className="page-heading-row">
        <div>
          <h1>{school.name || "Your timetable"}</h1>
          <p>Browse the latest saved timetable by class. Your generated schedule stays available after refresh.</p>
        </div>
      </div>
      {generated?.entries?.length ? (
        <SchedulePreview entries={generated.entries} />
      ) : (
        <Card icon={CalendarDays} title="No timetable yet" description="Generate a timetable from the Review step to see it here." accent="blue">
          <button className="primary-button" onClick={onGenerate}><Sparkles size={16} /> Generate timetable</button>
        </Card>
      )}
    </div>
  );
}

function SchedulePreview({ entries }) {
  const classNames = [...new Set(entries.map((entry) => entry.className))];
  const [selectedClass, setSelectedClass] = useState(classNames[0] || "");
  const classEntries = entries.filter(
    (entry) => entry.className === selectedClass,
  );
  const dayOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const days = dayOrder.filter((day) =>
    classEntries.some((entry) => entry.day === day),
  );
  const periods = [...new Set(classEntries.map((entry) => entry.period))].sort(
    (a, b) => a - b,
  );
  return (
    <Card
      icon={CalendarDays}
      title="Generated timetable"
      description="Each class has its own timetable. Choose a class to view its weekly schedule."
      accent="green"
    >
      <div className="schedule-meta">
        <span>
          <CheckCircle2 size={14} /> {entries.length} periods placed
        </span>
        <span>{classNames.length} class timetables</span>
      </div>
      <div className="class-tabs schedule-class-tabs">
        {classNames.map((name) => (
          <button
            className={selectedClass === name ? "active" : ""}
            key={name}
            onClick={() => setSelectedClass(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="schedule-table">
        <div className="schedule-head">
          <span>Period</span>
          {days.map((day) => (
            <span key={day}>{day.slice(0, 3)}</span>
          ))}
        </div>
        {periods.map((period) => (
          <div className="schedule-row" key={period}>
            <strong>P{period}</strong>
            {days.map((day) => {
              const entry = classEntries.find(
                (item) => item.day === day && item.period === period,
              );
              return (
                <div className="schedule-cell" key={`${day}-${period}`}>
                  {entry ? (
                    <>
                      <b
                        style={{
                          color: subjectColors[entry.subject] || "#3157d5",
                        }}
                      >
                        {entry.subject}
                      </b>
                      <small>{entry.teacher}</small>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

function AbsencePanel({ schoolId, teachers, notify }) {
  const [teacher, setTeacher] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState(null);
  const checkAbsence = async () => {
    if (!schoolId || !teacher) {
      notify(
        !schoolId
          ? "Connect the backend before checking absences"
          : "Add a teacher first",
      );
      return;
    }
    const response = await fetch(
      `${API_URL}/api/v1/schools/${schoolId}/absences`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, teacher, reason: "Planned absence" }),
      },
    );
    setResult(await response.json());
  };
  return (
    <Card
      icon={Clock3}
      title="Daily absence coverage"
      description="Create a date-specific exception without changing the approved base timetable."
      accent="coral"
    >
      <div className="absence-form">
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Absent teacher
          <select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">Select a teacher</option>
            {teachers.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
        <button className="secondary-button" onClick={checkAbsence}>
          <Users size={16} /> Find substitutes
        </button>
      </div>
      {result && (
        <div className="absence-result">
          <strong>{result.affected?.length || 0} affected periods</strong>
          <span>
            Available substitutes:{" "}
            {result.candidates?.length
              ? result.candidates.join(", ")
              : "No conflict-free candidates found"}
          </span>
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="metric">
      <Icon size={18} />
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
