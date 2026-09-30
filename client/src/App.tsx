import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronRight,
  FileQuestion,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Target,
  UserCircle,
  X
} from "lucide-react";
import { api } from "./lib/api";
import type { Subject, User } from "./lib/types";

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("padipufy_token");
    if (!token) return;

    api<{ user: User }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("padipufy_token");
      });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Landing user={user} />} />
      <Route
        path="/login"
        element={
          user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" onAuth={setUser} />
        }
      />
      <Route
        path="/register"
        element={
          user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="register" onAuth={setUser} />
        }
      />
      <Route
        path="/dashboard"
        element={
          user ? (
            <AppShell user={user} setUser={setUser}>
              <Dashboard user={user} />
            </AppShell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/profile"
        element={
          user ? (
            <AppShell user={user} setUser={setUser}>
              <Profile user={user} setUser={setUser} />
            </AppShell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/subjects"
        element={
          user ? (
            <AppShell user={user} setUser={setUser}>
              <Subjects />
            </AppShell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/"} replace />}
      />
    </Routes>
  );
}

function Landing({ user }: { user: User | null }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Brand />
        <div className="nav-actions">
          {user ? (
            <Link className="button primary" to="/dashboard">Open Dashboard</Link>
          ) : (
            <>
              <Link className="button ghost" to="/login">Login</Link>
              <Link className="button primary" to="/register">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={16} /> AI-powered learning</div>
            <h1>Study smarter.<br /><span>Prepare better.</span></h1>
            <p>
              padipufy AI will turn your study materials and previous-year
              question papers into a personalized study experience.
            </p>
            <div className="hero-actions">
              <Link className="button primary large" to={user ? "/dashboard" : "/register"}>
                Start studying <ChevronRight size={18} />
              </Link>
              <a className="button ghost large" href="#features">Explore features</a>
            </div>
            <div className="trust-row">
              <div><Brain size={17} /> AI Tutor</div>
              <div><FileQuestion size={17} /> PYQ Analysis</div>
              <div><CalendarDays size={17} /> Smart Planner</div>
            </div>
          </div>

          <div className="hero-card">
            <div className="mock-top">
              <div>
                <span className="muted">Today</span>
                <strong>Study Dashboard</strong>
              </div>
              <div className="avatar">SM</div>
            </div>
            <div className="mock-grid">
              <div className="metric"><span>Overall progress</span><strong>72%</strong><div className="progress"><i style={{ width: "72%" }} /></div></div>
              <div className="metric"><span>Study time</span><strong>2h 30m</strong><small>+32m this week</small></div>
            </div>
            <div className="mock-plan">
              <div className="section-title"><span>Today's plan</span><span className="pill">4 tasks</span></div>
              <div className="plan-item"><span className="dot purple" /><div><b>Data Structures</b><small>Unit 2 · 60 min</small></div><span>09:00</span></div>
              <div className="plan-item"><span className="dot blue" /><div><b>Mathematics</b><small>Fourier Series · 45 min</small></div><span>11:00</span></div>
              <div className="plan-item"><span className="dot green" /><div><b>PYQ Practice</b><small>Data Structures · 30 min</small></div><span>18:00</span></div>
            </div>
          </div>
        </section>

        <section id="features" className="feature-section">
          <div className="section-heading">
            <div className="eyebrow"><Target size={16} /> Built for students</div>
            <h2>Everything you need in one place.</h2>
            <p>The full AI learning toolkit will be added stage by stage.</p>
          </div>
          <div className="feature-grid">
            <Feature icon={<Brain />} title="AI Tutor" text="Ask questions and get explanations tailored to the way you want to study." />
            <Feature icon={<FileText />} title="Study Materials" text="Keep your notes, PDFs and other learning resources organized by subject." />
            <Feature icon={<FileQuestion />} title="PYQ Analysis" text="Upload previous-year papers and identify repeated topics and question patterns." />
            <Feature icon={<CalendarDays />} title="AI Study Planner" text="Build a realistic study plan around your exams and available time." />
            <Feature icon={<BarChart3 />} title="Progress Tracking" text="Track subject progress, study time and quiz performance." />
            <Feature icon={<Sparkles />} title="Smart Revision" text="Get revision recommendations based on weak topics and upcoming exams." />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function AuthPage({ mode, onAuth }: { mode: "login" | "register"; onAuth: (user: User) => void }) {
  const navigate = useNavigate();
  const isRegister = mode === "register";
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    college: "",
    course: "",
    yearSemester: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api<{ token: string; user: User }>(
        isRegister ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(form)
        }
      );

      localStorage.setItem("padipufy_token", data.token);
      onAuth(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand"><Brand /></div>
      <div className="auth-card">
        <div className="auth-heading">
          <div className="feature-icon large"><GraduationCap /></div>
          <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p>{isRegister ? "Start building your smarter study routine." : "Continue your study journey."}</p>
        </div>

        <form onSubmit={submit}>
          {isRegister && (
            <>
              <label>Full name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your name" /></label>
              <div className="form-row">
                <label>College / University<input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="Your college" /></label>
                <label>Course<input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="B.Tech AI" /></label>
              </div>
              <label>Year / Semester<input value={form.yearSemester} onChange={(e) => setForm({ ...form, yearSemester: e.target.value })} placeholder="1st Year / Semester 1" /></label>
            </>
          )}

          <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
          <label>Password<input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>

          {error && <div className="error-box">{error}</div>}

          <button className="button primary full" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create account" : "Login"}
          </button>
        </form>

        <p className="switch-auth">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Login" : "Register"}</Link>
        </p>
      </div>
    </div>
  );
}

function AppShell({ user, setUser, children }: { user: User; setUser: (user: User | null) => void; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("padipufy_theme") === "dark");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("padipufy_theme", dark ? "dark" : "light");
  }, [dark]);

  function logout() {
    localStorage.removeItem("padipufy_token");
    setUser(null);
    navigate("/login");
  }

  const links = [
    ["/dashboard", LayoutDashboard, "Dashboard"],
    ["/subjects", BookOpen, "My Subjects"],
    ["#", FileText, "Study Materials"],
    ["#", FileQuestion, "PYQ Analysis"],
    ["#", Brain, "AI Tutor"],
    ["#", CalendarDays, "Study Planner"],
    ["#", Sparkles, "Quiz"],
    ["#", BarChart3, "Progress"]
  ] as const;

  return (
    <div className="app-shell">
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}><X /></button>
        </div>

        <div className="profile-mini">
          <div className="avatar">{initials(user.fullName)}</div>
          <div><strong>{user.fullName}</strong><span>Student</span></div>
        </div>

        <nav className="side-nav">
          {links.map(([to, Icon, label]) =>
            to === "#" ? (
              <button key={label} className="nav-link disabled" onClick={() => alert(`${label} will be enabled in the next stage.`)}>
                <Icon size={18} /> {label}<span className="soon">Soon</span>
              </button>
            ) : (
              <Link key={label} className="nav-link" to={to} onClick={() => setMobileOpen(false)}>
                <Icon size={18} /> {label}
              </Link>
            )
          )}
        </nav>

        <div className="side-bottom">
          <Link className="nav-link" to="/profile"><UserCircle size={18} /> Profile</Link>
          <button className="nav-link" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />} {dark ? "Light mode" : "Dark mode"}</button>
          <button className="nav-link logout" onClick={logout}><LogOut size={18} /> Logout</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}><Menu /></button>
          <div className="topbar-spacer" />
          <button className="icon-button" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</button>
          <Link className="icon-button" to="/profile"><Settings /></Link>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function Dashboard({ user }: { user: User }) {
  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ subjects: Subject[] }>("/subjects")
      .then((data) => setSubjects(data.subjects))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load subjects."));
  }, []);

  const nextExam = useMemo(() => {
    const upcoming = subjects
      .filter((s) => s.exam_date)
      .map((s) => ({ ...s, time: new Date(`${s.exam_date}T00:00:00`).getTime() }))
      .filter((s) => s.time >= Date.now())
      .sort((a, b) => a.time - b.time)[0];
    return upcoming;
  }, [subjects]);

  const days = nextExam ? Math.max(0, Math.ceil((nextExam.time - Date.now()) / 86400000)) : null;

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow"><Sparkles size={16} /> Study dashboard</div>
          <h1>{greeting}, {user.fullName.split(" ")[0]} 👋</h1>
          <p>Keep your momentum going. Your smarter study workspace starts here.</p>
        </div>
        <Link className="button primary" to="/subjects"><Plus size={17} /> Add subject</Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="metric-grid">
        <Metric title="Upcoming exam" value={nextExam?.name || "Not added"} sub={nextExam ? `${days} days remaining` : "Add an exam date"} icon={<CalendarDays />} />
        <Metric title="Overall progress" value={subjects.length ? `${Math.round(subjects.reduce((a, s) => a + s.preparation_percent, 0) / subjects.length)}%` : "0%"} sub="Across your subjects" icon={<Target />} />
        <Metric title="Study hours" value="0h 00m" sub="Start tracking in a later stage" icon={<BarChart3 />} />
        <Metric title="PYQs analyzed" value="0" sub="PYQ analysis coming next" icon={<FileQuestion />} />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>My subjects</h2><p>Your current preparation status.</p></div><Link to="/subjects">View all</Link></div>
          {subjects.length === 0 ? (
            <Empty icon={<BookOpen />} title="No subjects yet" text="Add your first subject to start building your study workspace." action={<Link className="button primary" to="/subjects"><Plus size={16} /> Add subject</Link>} />
          ) : (
            <div className="subject-list">
              {subjects.slice(0, 5).map((subject) => (
                <div className="subject-row" key={subject.id}>
                  <div className="subject-icon"><BookOpen size={18} /></div>
                  <div className="subject-info"><strong>{subject.name}</strong><span>{subject.difficulty} · {subject.exam_date || "No exam date"}</span></div>
                  <div className="subject-progress"><b>{subject.preparation_percent}%</b><div className="progress"><i style={{ width: `${subject.preparation_percent}%` }} /></div></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading"><div><h2>Today's plan</h2><p>AI planning arrives in a later stage.</p></div><CalendarDays size={19} /></div>
          <Empty icon={<CalendarDays />} title="No study plan yet" text="Once the AI planner is enabled, your daily sessions will appear here." />
        </section>
      </div>

      <section className="panel feature-preview">
        <div className="preview-icon"><Brain /></div>
        <div><span className="pill purple-pill">Coming next</span><h2>AI Tutor + PYQ Analysis</h2><p>Upload your study materials and previous-year papers, then ask questions using your own resources.</p></div>
        <button className="button secondary" onClick={() => alert("AI Tutor and PYQ Analysis are part of Stage 2+.")}>Preview</button>
      </section>
    </>
  );
}

function Metric({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return <div className="metric-card"><div className="metric-icon">{icon}</div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>;
}

function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", courseCode: "", difficulty: "Medium", preparationPercent: 0, examDate: "" });
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ subjects: Subject[] }>("/subjects");
    setSubjects(data.subjects);
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/subjects", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", courseCode: "", difficulty: "Medium", preparationPercent: 0, examDate: "" });
      setShow(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add subject.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this subject?")) return;
    try {
      await api(`/subjects/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete subject.");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow"><BookOpen size={16} /> Academic setup</div><h1>My subjects</h1><p>Add the subjects you want padipufy AI to organize.</p></div>
        <button className="button primary" onClick={() => setShow(true)}><Plus size={17} /> Add subject</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {subjects.length === 0 ? (
        <div className="panel"><Empty icon={<BookOpen />} title="No subjects added" text="Add your first subject and optionally set its exam date and preparation level." action={<button className="button primary" onClick={() => setShow(true)}><Plus size={16} /> Add subject</button>} /></div>
      ) : (
        <div className="subject-cards">
          {subjects.map((subject) => (
            <div className="subject-card" key={subject.id}>
              <div className="subject-card-top"><div className="subject-icon"><BookOpen size={20} /></div><button className="text-danger" onClick={() => remove(subject.id)}>Delete</button></div>
              <h3>{subject.name}</h3>
              <p>{subject.course_code || "No course code"} · {subject.difficulty}</p>
              <div className="subject-card-progress"><div><span>Preparation</span><b>{subject.preparation_percent}%</b></div><div className="progress"><i style={{ width: `${subject.preparation_percent}%` }} /></div></div>
              <div className="exam-label"><CalendarDays size={15} /> {subject.exam_date ? `Exam: ${subject.exam_date}` : "No exam date set"}</div>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="modal-backdrop" onMouseDown={() => setShow(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-heading"><div><h2>Add subject</h2><p>Set the basics now; units and topics come next.</p></div><button className="icon-button" onClick={() => setShow(false)}><X /></button></div>
            <form onSubmit={addSubject}>
              <label>Subject name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Data Structures" /></label>
              <div className="form-row"><label>Course code<input value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} placeholder="18CSC201J" /></label><label>Difficulty<select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option></select></label></div>
              <label>Exam date<input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} /></label>
              <label>Current preparation: {form.preparationPercent}%<input type="range" min="0" max="100" value={form.preparationPercent} onChange={(e) => setForm({ ...form, preparationPercent: Number(e.target.value) })} /></label>
              <div className="modal-actions"><button type="button" className="button ghost" onClick={() => setShow(false)}>Cancel</button><button className="button primary">Save subject</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Profile({ user, setUser }: { user: User; setUser: (u: User) => void }) {
  const [form, setForm] = useState({
    fullName: user.fullName,
    college: user.college || "",
    course: user.course || "",
    yearSemester: user.yearSemester || ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const data = await api<{ user: User }>("/auth/me", { method: "PUT", body: JSON.stringify(form) });
      setUser(data.user);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile.");
    }
  }

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow"><UserCircle size={16} /> Account</div><h1>Your profile</h1><p>Keep your academic information up to date.</p></div></div>
      <div className="panel profile-panel">
        <form onSubmit={save}>
          <div className="profile-avatar">{initials(user.fullName)}</div>
          <label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
          <label>Email<input value={user.email} disabled /></label>
          <div className="form-row"><label>College / University<input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /></label><label>Course<input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></label></div>
          <label>Year / Semester<input value={form.yearSemester} onChange={(e) => setForm({ ...form, yearSemester: e.target.value })} /></label>
          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}
          <button className="button primary">Save changes</button>
        </form>
      </div>
    </>
  );
}

function Brand() {
  return <Link to="/" className="brand"><div className="brand-mark"><Sparkles size={18} /></div><span>Padipufy <b>AI</b></span></Link>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default App;
