"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BookMarked,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Frown,
  Flag,
  Gauge,
  GraduationCap,
  GripVertical,
  LayoutDashboard,
  Layers3,
  LibraryBig,
  ListChecks,
  MapPinned,
  Meh,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { bankPriorities, medicalCardDeck, topicBank, type BankKey, type StudyTopic } from "./topics";
import { supabase } from "@/lib/supabase";

type Task = {
  id: number;
  area: string;
  topic: string;
  kind: string;
  duration: number;
  questions: number;
  reason: string;
  color: string;
  unit?: string;
};

type QuestionLog = {
  id: number;
  topic: string;
  area: string;
  questions: number;
  accuracy: number;
  date: string;
};

type AgendaEvent = {
  id: number;
  day: number;
  topic: string;
  meta: string;
  type: "rotation" | "questions" | "review" | "cards" | "theory";
};

type Profile = { id: string; name: string; color: string };
type BankWeights = Record<BankKey, number>;
type PrioritySuggestion = { topic: string; area: StudyTopic["area"]; score: number; rank: number; questions: number; sourceBank: string };

const DEFAULT_PROFILES: Profile[] = [{ id: "joao", name: "João", color: "#0f8f77" }];
const DEFAULT_BANKS: BankWeights = { sespe: 0, enare: 0, sussp: 0, psumg: 0, uspsp: 0, usprp: 0, unicamp: 0, unifesp: 0, iamspe: 0 };

const initialTasks: Task[] = [
  { id: 1, area: "CONFIGURAÇÃO", topic: "Escolher bancas e definir a meta", kind: "Primeiro passo", duration: 10, questions: 1, unit: "etapa", reason: "A incidência das bancas define o que vem primeiro", color: "purple" },
  { id: 2, area: "FOCO ATUAL", topic: "Definir o assunto que está estudando", kind: "Partida do zero", duration: 5, questions: 1, unit: "assunto", reason: "O GPS cria a primeira semana sem avaliação inicial", color: "blue" },
];

const initialAgenda: AgendaEvent[] = [];

const topicRows = [
  ["Abdome Agudo Inflamatório", "Cirurgia", "—", "—", "A definir", "Pendente"],
  ["Síndromes Hipertensivas da Gestação", "GO", "—", "—", "A definir", "Pendente"],
  ["Sepse e Choque Séptico", "Clínica Médica", "—", "—", "A definir", "Pendente"],
  ["Imunizações", "Pediatria", "—", "—", "A definir", "Pendente"],
];

const nav = [
  ["Hoje", LayoutDashboard],
  ["Meu plano", Route],
  ["Flashcards", Layers3],
  ["Questões", ListChecks],
  ["Assuntos", LibraryBig],
  ["Prioridades", MapPinned],
  ["Desempenho", BarChart3],
  ["Simulados", ClipboardCheck],
  ["Revisões", CalendarClock],
  ["Bancas e metas", Target],
] as const;

function Logo() {
  return (
    <div className="logo-wrap">
      <div className="logo-mark"><Route size={22} /></div>
      <div><strong>GPS</strong><span>da Aprovação</span></div>
    </div>
  );
}

export default function Dashboard({ ownerId }: { ownerId: string }) {
  const [active, setActive] = useState("Hoje");
  const [done, setDone] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [target, setTarget] = useState(0);
  const [hours, setHours] = useState(0);
  const [safety, setSafety] = useState(0);
  const [banks, setBanks] = useState<BankWeights>(DEFAULT_BANKS);
  const [currentTopic, setCurrentTopic] = useState("");
  const [recalculated, setRecalculated] = useState(false);
  const [questionLogs, setQuestionLogs] = useState<QuestionLog[]>([]);
  const [studiedTopics, setStudiedTopics] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState("joao");
  const [profileOpen, setProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [appReady, setAppReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const activeProfile = profiles.find(profile => profile.id === activeProfileId) ?? profiles[0] ?? DEFAULT_PROFILES[0];

  useEffect(() => {
    let cancelled = false;
    async function loadProfiles() {
      if (!supabase) return;
      const { data, error } = await supabase.from("study_profiles").select("id,name,color").order("created_at");
      if (cancelled) return;
      if (error) { setToast(`Não foi possível carregar os perfis: ${error.message}`); setAppReady(true); return; }
      let rows = data ?? [];
      if (!rows.length) {
        const created = await supabase.from("study_profiles").insert({ owner_id: ownerId, name: "João", color: "#0f8f77" }).select("id,name,color").single();
        if (created.data) rows = [created.data];
      }
      const cloudProfiles = rows.slice(0, 4).map(row => ({ id: row.id, name: row.name, color: row.color }));
      const preferred = localStorage.getItem(`gps-active-profile-${ownerId}`);
      setProfiles(cloudProfiles.length ? cloudProfiles : DEFAULT_PROFILES);
      setActiveProfileId(cloudProfiles.some(profile => profile.id === preferred) ? preferred! : cloudProfiles[0]?.id ?? "joao");
      setAppReady(true);
    }
    loadProfiles();
    return () => { cancelled = true; };
  }, [ownerId]);

  useEffect(() => {
    if (!appReady) return;
    const timer = setTimeout(() => {
      setHydrated(false);
      const loadCloudState = async () => {
        const result = await supabase?.from("profile_states").select("data").eq("profile_id", activeProfileId).eq("scope", "main").maybeSingle();
        const parsed = result?.data?.data;
        if (parsed) {
          setDone(parsed.done ?? []); setTarget(parsed.target ?? 0); setHours(parsed.hours ?? 0); setSafety(parsed.safety ?? 0);
          setBanks({ ...DEFAULT_BANKS, ...(parsed.banks ?? {}) }); setQuestionLogs(parsed.questionLogs ?? []);
          setStudiedTopics(parsed.studiedTopics ?? []); setCurrentTopic(parsed.currentTopic ?? ""); setRecalculated(parsed.recalculated ?? false);
        } else {
          setDone([]); setTarget(0); setHours(0); setSafety(0); setBanks(DEFAULT_BANKS);
          setQuestionLogs([]); setStudiedTopics([]); setCurrentTopic(""); setRecalculated(false);
        }
        setHydrated(true);
      };
      loadCloudState();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeProfileId, appReady]);

  useEffect(() => {
    if (!appReady || !hydrated || !supabase || activeProfileId === "joao") return;
    const client = supabase;
    const timer = setTimeout(() => {
      client.from("profile_states").upsert({ profile_id: activeProfileId, scope: "main", data: { done, target, hours, safety, banks, questionLogs, studiedTopics, currentTopic, recalculated }, updated_at: new Date().toISOString() }).then(({ error }) => { if (error) setToast(`Falha ao sincronizar: ${error.message}`); });
    }, 450);
    return () => clearTimeout(timer);
  }, [done, target, hours, safety, banks, questionLogs, studiedTopics, currentTopic, recalculated, hydrated, appReady, activeProfileId]);

  useEffect(() => {
    if (appReady) localStorage.setItem(`gps-active-profile-${ownerId}`, activeProfileId);
  }, [activeProfileId, appReady, ownerId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const completedMinutes = useMemo(() => initialTasks.filter(t => done.includes(t.id)).reduce((sum, t) => sum + t.duration, 0), [done]);
  const totalMinutes = initialTasks.reduce((sum, t) => sum + t.duration, 0);
  const progress = Math.round((completedMinutes / totalMinutes) * 100);
  const probability = questionLogs.length ? Math.min(91, 45 + done.length * 3 + (recalculated ? 2 : 0)) : 0;
  const dailyCards = studiedTopics.length ? Math.min(45, 10 + questionLogs.reduce((sum, log) => sum + (log.accuracy < 60 ? 4 : log.accuracy < 70 ? 2 : 1), 0)) : 0;
  const totalBankWeight = Object.values(banks).reduce((sum, value) => sum + value, 0);
  const prioritySuggestions = useMemo<PrioritySuggestion[]>(() => {
    const scores = new Map<string, { score: number; sourceBank: string }>();
    bankPriorities.forEach(bank => {
      const weight = banks[bank.key] ?? 0;
      if (!weight) return;
      bank.topics.forEach((topic, index) => {
        const points = weight * (10 - index) / 10;
        const current = scores.get(topic) ?? { score: 0, sourceBank: bank.name };
        scores.set(topic, { score: current.score + points, sourceBank: current.score >= points ? current.sourceBank : bank.name });
      });
    });
    if (currentTopic) {
      const current = scores.get(currentTopic) ?? { score: 0, sourceBank: "Foco atual" };
      scores.set(currentTopic, { score: current.score + 100, sourceBank: "Foco atual" });
    }
    questionLogs.forEach(log => {
      const current = scores.get(log.topic);
      if (current) scores.set(log.topic, { ...current, score: current.score * (log.accuracy < 60 ? 1.35 : log.accuracy < 75 ? 1.12 : 0.82) });
    });
    return [...scores.entries()].map(([topic, value]) => {
      const match = topicBank.find(item => item.title === topic);
      return { topic, area: match?.area ?? "Clínica Médica", score: value.score, sourceBank: value.sourceBank };
    }).sort((a, b) => b.score - a.score).slice(0, 12).map((item, index) => ({ ...item, rank: index + 1, questions: Math.max(15, Math.min(60, 40 - index * 2 + (item.topic === currentTopic ? 15 : 0))) }));
  }, [banks, currentTopic, questionLogs]);

  async function addProfile() {
    const name = newProfileName.trim();
    if (!name) return setToast("Digite o nome do novo perfil.");
    if (profiles.length >= 4) return setToast("Você já atingiu o limite de quatro perfis.");
    const colors = ["#7257d5", "#e4835f", "#4f88cf"];
    if (!supabase) return;
    const { data, error } = await supabase.from("study_profiles").insert({ owner_id: ownerId, name, color: colors[(profiles.length - 1) % colors.length] }).select("id,name,color").single();
    if (error || !data) return setToast(error?.message ?? "Não foi possível criar o perfil.");
    const profile = { id: data.id, name: data.name, color: data.color };
    setHydrated(false); setProfiles(prev => [...prev, profile]); setActiveProfileId(profile.id); setNewProfileName(""); setProfileOpen(false);
    setToast(`Perfil de ${name} criado.`);
  }

  function switchProfile(id: string) {
    setHydrated(false); setActiveProfileId(id); setProfileOpen(false); setActive("Hoje");
  }

  function toggleTask(id: number) {
    setDone(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }

  function savePlanner() {
    const total = Object.values(banks).reduce((sum, value) => sum + value, 0);
    if (total !== 100) {
      setToast(`A soma dos pesos deve ser 100% — agora está em ${total}%.`);
      return;
    }
    setPlannerOpen(false);
    setRecalculated(true);
    setDone(prev => prev.includes(1) ? prev : [...prev, 1]);
    if (currentTopic) setDone(prev => prev.includes(2) ? prev : [...prev, 2]);
    setToast(currentTopic ? "Rotina criada com as prioridades e o seu assunto atual." : "Bancas salvas. Agora informe o assunto que está estudando.");
  }

  const sectionTitle: Record<string, string> = {
    "Meu plano": "Sua agenda inteligente",
    "Flashcards": "Flashcards do dia",
    "Questões": "Registro de questões",
    "Assuntos": "Banco de assuntos",
    "Prioridades": "O que mais cai em cada banca",
    "Desempenho": "Desempenho e prioridades",
    "Simulados": "Simulados completos",
    "Revisões": "Fila inteligente de revisões",
    "Bancas e metas": "Bancas, pesos e meta",
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-head"><Logo /><button className="icon-button close-mobile" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={20} /></button></div>
        <nav className="nav-list" aria-label="Navegação principal">
          {nav.map(([label, Icon]) => (
            <button key={label} className={active === label ? "active" : ""} onClick={() => { setActive(label); setMenuOpen(false); }}>
              <Icon size={19} /><span>{label}</span>{label === "Revisões" && studiedTopics.length > 0 && <b className="nav-badge">{studiedTopics.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="exam-mini">
          <div className="exam-icon"><Flag size={18} /></div>
          <div><small>PRÓXIMA PROVA</small><strong>Não configurada</strong><span>Escolher banca e data</span></div>
        </div>
        <button className="nav-settings"><Settings size={19} /> Configurações</button>
        <button className="profile-mini" onClick={() => setProfileOpen(true)}>
          <div className="avatar" style={{ background: activeProfile.color }}>{activeProfile.name.charAt(0).toUpperCase()}</div><div><strong>{activeProfile.name}</strong><span>Trocar perfil</span></div><MoreHorizontal size={18} />
        </button>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button>
          <div className="mobile-logo"><Logo /></div>
          <div className="topbar-spacer" />
          <div className="streak"><Zap size={16} fill="currentColor" /><span><b>0 dias</b> de sequência</span></div>
          <button className="help"><CircleHelp size={19} /><span>Ajuda</span></button>
          <button className="top-avatar" style={{ background: activeProfile.color }} onClick={() => setProfileOpen(true)} aria-label="Trocar perfil">{activeProfile.name.charAt(0).toUpperCase()}</button>
        </header>

        <main className="content">
          {active === "Hoje" ? (
            <>
              <section className="welcome-row">
                <div><p className="eyebrow">SEU PRIMEIRO DIA</p><h1>Boa noite, {activeProfile.name}! <span>👋</span></h1><p>Seu GPS está zerado. Complete os primeiros passos para receber um plano realmente personalizado.</p></div>
                <button className="outline-button" onClick={() => setPlannerOpen(true)}><Settings size={17} /> Ajustar plano</button>
              </section>

              <section className="hero-grid">
                <div className="today-card">
                  <div className="today-top">
                    <div><div className="live-pill"><Sparkles size={13} /> COMEÇAR DO ZERO</div><h2>Configure sua primeira rota</h2><p>{recalculated ? (currentTopic ? `Rotina direcionada para ${currentTopic}.` : "Bancas salvas. Falta escolher o assunto atual.") : "Sem prova diagnóstica: partimos do pressuposto de conhecimento zero."}</p></div>
                    <div className="today-progress" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress}%</strong><span>concluído</span></div></div>
                  </div>
                  <div className="task-list">
                    {initialTasks.map((task, index) => {
                      const isDone = done.includes(task.id);
                      return (
                        <article className={`task ${isDone ? "done" : ""}`} key={task.id}>
                          <button className="task-check" onClick={() => toggleTask(task.id)} aria-label={isDone ? "Marcar como pendente" : "Concluir tarefa"}>{isDone ? <Check size={17} /> : index + 1}</button>
                          <div className={`task-color ${task.color}`}><BookOpenCheck size={20} /></div>
                          <div className="task-main"><div><span className="task-area">{task.area}</span><span className="task-kind">{task.kind}</span></div><h3>{task.topic}</h3><p><BrainCircuit size={14} /> {task.reason}</p></div>
                          <div className="task-numbers"><div><small>QUANTO</small><strong>{task.unit === "cards" ? dailyCards : task.questions} {task.unit ?? "questões"}</strong></div><div><small>QUANDO</small><strong><Clock3 size={14} /> {Math.floor(task.duration / 60) ? `${Math.floor(task.duration / 60)}h ` : ""}{task.duration % 60}min</strong></div></div>
                          <button className="start-button" onClick={() => { if (!isDone && task.id === 1) { setPlannerOpen(true); return; } if (!isDone && task.id === 2) { setActive("Assuntos"); return; } toggleTask(task.id); setToast(isDone ? "Tarefa reaberta." : `Ótimo! ${task.topic} registrado no seu progresso.`); }}>{isDone ? <Check size={17} /> : <Play size={16} fill="currentColor" />}{isDone ? "Concluído" : "Começar"}</button>
                        </article>
                      );
                    })}
                  </div>
                  <div className="today-footer"><span><Clock3 size={16} /> {completedMinutes} de {totalMinutes} minutos concluídos</span><button onClick={() => setStudyOpen(true)}>Adicionar estudo <Plus size={16} /></button></div>
                </div>

                <aside className="score-card">
                  <div className="card-heading"><div><span className="section-kicker">GPS SCORE</span><h2>Chance de atingir a meta</h2></div><div className="info-dot">i</div></div>
                  <div className="score-gauge" style={{ "--score": `${probability * 1.8}deg` } as React.CSSProperties}>
                    <div className="gauge-cover"><strong>{probability ? `${probability}%` : "0%"}</strong><span>{probability ? "chance atual" : "ponto de partida"}</span></div>
                  </div>
                  <div className="score-status"><BrainCircuit size={18} /><div><strong>{probability ? "Estimativa inicial disponível" : "Começando do zero"}</strong><span>{probability ? "Atualizada com seus registros" : "A estimativa evolui com suas questões"}</span></div></div>
                  <div className="score-route">
                    <div><span>—</span><small>INÍCIO</small></div><div className="route-line"><i style={{ width: "0%" }} /><b style={{ left: "0%" }} /></div><div><span>{target ? `${target}%` : "—"}</span><small>META</small></div>
                  </div>
                  <div className="projection"><div><small>NOTA PROJETADA</small><strong>{probability ? "Calculando" : "0% inicial"}</strong></div><span>{questionLogs.length} registros</span></div>
                  <button className="full-link" onClick={() => setActive("Desempenho")}>Entender meu GPS Score <ChevronRight size={17} /></button>
                </aside>
              </section>

              <section className="lower-grid">
                <div className="panel priority-panel">
                  <div className="panel-title"><div><h2>{prioritySuggestions.length ? "Prioridades calculadas para você" : "Prioridades aguardando suas escolhas"}</h2><p>{prioritySuggestions.length ? "Incidência das bancas + foco atual + desempenho registrado." : "Escolha as bancas e o assunto atual; nenhuma avaliação inicial é necessária."}</p></div><button onClick={() => setActive("Prioridades")}>Ver bancas <ChevronRight size={16} /></button></div>
                  <div className="topic-table-wrap"><table className="topic-table"><thead><tr><th>TEMA</th><th>ORIGEM</th><th>ÍNDICE</th><th>QUESTÕES SUGERIDAS</th></tr></thead><tbody>{(prioritySuggestions.length ? prioritySuggestions.slice(0, 4) : topicRows.slice(0, 4).map((row, index) => ({ topic: row[0], area: row[1] as StudyTopic["area"], sourceBank: "A configurar", score: 0, questions: 0, rank: index + 1 }))).map(item => <tr key={item.topic}><td><b className="rank">{item.rank}</b><div><strong>{item.topic}</strong><span>{item.area}</span></div></td><td><strong>{item.sourceBank}</strong></td><td><span className="accuracy">{item.score ? Math.round(item.score) : "—"}</span></td><td><strong>{item.questions ? `${item.questions} questões` : "A definir"}</strong></td></tr>)}</tbody></table></div>
                </div>

                <div className="panel revision-panel">
                  <div className="panel-title"><div><h2>Próximas revisões</h2><p>As revisões surgirão quando você marcar um assunto como estudado.</p></div><button onClick={() => setActive("Assuntos")}>Escolher assunto <ChevronRight size={16} /></button></div>
                  <EmptyMini icon={<CalendarClock size={22} />} title="Nenhuma revisão agendada" text="Seu histórico começa completamente vazio." />
                  <button className="recalculate" onClick={() => { setRecalculated(true); setToast("Atrasos absorvidos. Sua rota foi redistribuída até a prova."); }}><RefreshCw size={17} /> Recalcular minha rota</button>
                </div>
              </section>

              <section className="quick-actions">
                <div><span className="section-kicker">AÇÕES RÁPIDAS</span><h2>Alimente seu GPS</h2></div>
                <button onClick={() => setStudyOpen(true)}><span className="action-icon mint"><BookOpenCheck size={20} /></span><div><strong>Registrar teoria</strong><small>Agende as revisões 1, 2 e 3</small></div><ChevronRight size={17} /></button>
                <button onClick={() => setToast("Área de simulados aberta para cadastro.")}><span className="action-icon peach"><ClipboardCheck size={20} /></span><div><strong>Cadastrar prova</strong><small>Compare bancas pela dificuldade</small></div><ChevronRight size={17} /></button>
                <button onClick={() => setActive("Assuntos")}><span className="action-icon lilac"><LibraryBig size={20} /></span><div><strong>Explorar assuntos</strong><small>{topicBank.length} temas disponíveis</small></div><ChevronRight size={17} /></button>
              </section>
            </>
          ) : (
            <section className="secondary-page">
              <div className="secondary-head"><div><p className="eyebrow">GPS DA APROVAÇÃO</p><h1>{sectionTitle[active]}</h1><p>Todos os dados abaixo conversam com sua rota diária e são recalculados conforme seu progresso.</p></div>{!(["Meu plano", "Flashcards", "Questões", "Assuntos", "Prioridades"].includes(active)) && <button className="primary-button" onClick={() => active === "Bancas e metas" ? setPlannerOpen(true) : setToast("Novo registro adicionado à sua fila.")}><Plus size={17} /> {active === "Bancas e metas" ? "Ajustar metas" : "Novo registro"}</button>}</div>
              {active === "Meu plano" && <PlanPage setToast={setToast} profileId={activeProfileId} currentTopic={currentTopic} priorities={prioritySuggestions} />}
              {active === "Flashcards" && <FlashcardsPage logs={questionLogs} dailyCards={dailyCards} setToast={setToast} profileId={activeProfileId} studiedTopics={studiedTopics} onOpenTopics={() => setActive("Assuntos")} />}
              {active === "Questões" && <QuestionsPage logs={questionLogs} setLogs={setQuestionLogs} setToast={setToast} setStudiedTopics={setStudiedTopics} />}
              {active === "Assuntos" && <TopicsPage studiedTopics={studiedTopics} setStudiedTopics={setStudiedTopics} setToast={setToast} currentTopic={currentTopic} setCurrentTopic={topic => { setCurrentTopic(topic); setDone(prev => prev.includes(2) ? prev : [...prev, 2]); }} />}
              {active === "Prioridades" && <PrioritiesPage banks={banks} priorities={prioritySuggestions} onConfigure={() => setPlannerOpen(true)} />}
              {active === "Desempenho" && <PerformancePage probability={probability} hasData={questionLogs.length > 0} logs={questionLogs} />}
              {active === "Simulados" && <SimuladosPage />}
              {active === "Revisões" && <ReviewsPage />}
              {active === "Bancas e metas" && <GoalsPage banks={banks} target={target} currentTopic={currentTopic} onEdit={() => setPlannerOpen(true)} />}
            </section>
          )}
        </main>
      </div>

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      {toast && <div className="toast"><Check size={18} />{toast}</div>}

      {profileOpen && <div className="modal-backdrop profile-backdrop" onMouseDown={() => setProfileOpen(false)}><div className="profile-picker" role="dialog" aria-modal="true" aria-label="Escolher perfil" onMouseDown={event => event.stopPropagation()}><div className="profile-picker-head"><div><span className="section-kicker">QUEM ESTÁ ESTUDANDO?</span><h2>Escolha um perfil</h2><p>Cada perfil mantém agenda, métricas e progresso separados.</p></div><button className="icon-button" onClick={() => setProfileOpen(false)}><X size={20} /></button></div><div className="profile-grid">{profiles.map(profile => <button className={profile.id === activeProfileId ? "selected" : ""} key={profile.id} onClick={() => switchProfile(profile.id)}><span className="profile-avatar-large" style={{ background: profile.color }}>{profile.name.charAt(0).toUpperCase()}</span><strong>{profile.name}</strong><small>{profile.id === activeProfileId ? "Perfil atual" : "Entrar"}</small></button>)}{profiles.length < 4 && <div className="new-profile-card"><span className="profile-avatar-large empty"><UserPlus size={25} /></span><input aria-label="Nome do novo perfil" placeholder="Novo perfil" value={newProfileName} onChange={event => setNewProfileName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") addProfile(); }} /><button onClick={addProfile}>Adicionar</button></div>}</div><div className="profile-limit"><Users size={15} /> {profiles.length} de 4 perfis utilizados</div></div></div>}

      {plannerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPlannerOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Ajustar plano" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head"><div><span className="section-kicker">SUPER PLANNER</span><h2>Ajuste sua rota</h2><p>Os pesos determinam quanto cada banca influencia suas prioridades.</p></div><button className="icon-button" onClick={() => setPlannerOpen(false)}><X size={20} /></button></div>
            <div className="bank-total"><span>Distribuição das bancas</span><strong className={totalBankWeight === 100 ? "valid" : ""}>{totalBankWeight}% de 100%</strong></div>
            <div className="bank-fields bank-fields-expanded">
              {bankPriorities.map(bank => <label key={bank.key}><span><b>{bank.name}</b><small>{bank.short}</small></span><div><input aria-label={`Peso ${bank.name}`} type="number" min="0" max="100" value={banks[bank.key]} onChange={e => setBanks({ ...banks, [bank.key]: Number(e.target.value) })} /><em>%</em></div></label>)}
            </div>
            <label className="plain-field focus-field">Assunto que você está estudando agora<input list="planner-topics" value={currentTopic} onChange={e => setCurrentTopic(e.target.value)} placeholder="Ex.: Síndromes Hipertensivas da Gestação" /><datalist id="planner-topics">{topicBank.map(topic => <option value={topic.title} key={topic.id} />)}</datalist><small>Esse tema recebe um reforço temporário sem apagar a prioridade das bancas.</small></label>
            <div className="two-fields"><label>Meta de nota<div><input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} /><em>%</em></div></label><label>Margem de segurança<div><input type="number" value={safety} onChange={e => setSafety(Number(e.target.value))} /><em>pts</em></div></label></div>
            <label className="range-label"><span><b>Horas disponíveis por dia</b><strong>{hours}h</strong></span><input type="range" min="0" max="8" step="0.5" value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
            <div className="modal-note"><ShieldCheck size={19} /><p><strong>Seu plano é adaptativo.</strong> Se você atrasar, o GPS redistribui o conteúdo restante sem perder de vista a prova.</p></div>
            <div className="modal-actions"><button className="text-button" onClick={() => setPlannerOpen(false)}>Cancelar</button><button className="primary-button" onClick={savePlanner}><RefreshCw size={17} /> Recalcular plano</button></div>
          </div>
        </div>
      )}

      {studyOpen && (
        <div className="modal-backdrop" onMouseDown={() => setStudyOpen(false)}>
          <div className="modal compact" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head"><div><span className="section-kicker">NOVO ESTUDO</span><h2>Registrar teoria vista</h2><p>O GPS criará automaticamente as três revisões.</p></div><button className="icon-button" onClick={() => setStudyOpen(false)}><X size={20} /></button></div>
            <label className="plain-field">Tema<input placeholder="Ex.: Insuficiência cardíaca" /></label>
            <div className="two-fields"><label>Grande área<select defaultValue="Clínica Médica"><option>Clínica Médica</option><option>Cirurgia</option><option>Ginecologia e Obstetrícia</option><option>Pediatria</option><option>Preventiva</option></select></label><label>Data da teoria<input type="date" defaultValue="2026-08-10" /></label></div>
            <div className="review-preview"><CalendarClock size={19} /><div><strong>Revisões sugeridas</strong><span>17 ago · 31 ago · 28 set</span></div></div>
            <div className="modal-actions"><button className="text-button" onClick={() => setStudyOpen(false)}>Cancelar</button><button className="primary-button" onClick={() => { setStudyOpen(false); setToast("Teoria registrada e três revisões agendadas."); }}><Check size={17} /> Salvar e agendar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanPage({ setToast, profileId, currentTopic, priorities }: { setToast: (message: string) => void; profileId: string; currentTopic: string; priorities: PrioritySuggestion[] }) {
  const days = [["SEG", "10"], ["TER", "11"], ["QUA", "12"], ["QUI", "13"], ["SEX", "14"], ["SÁB", "15"], ["DOM", "16"]];
  const [events, setEvents] = useState<AgendaEvent[]>(initialAgenda);
  const [dragged, setDragged] = useState<number | null>(null);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [rotation, setRotation] = useState({ area: "Nenhum rodízio cadastrado", start: "", end: "", boost: 40 });
  const [newBlock, setNewBlock] = useState({ topic: "", day: 0, meta: "45 min", type: "theory" as AgendaEvent["type"] });
  const [agendaHydrated, setAgendaHydrated] = useState(false);
  const suggestedAgenda = useMemo<AgendaEvent[]>(() => {
    if (!currentTopic) return [];
    const nextTopics = priorities.filter(item => item.topic !== currentTopic).slice(0, 2);
    return [
      { id: 81001, day: 0, topic: currentTopic, meta: "Teoria guiada · 60 min", type: "theory" },
      { id: 81002, day: 0, topic: currentTopic, meta: `${priorities.find(item => item.topic === currentTopic)?.questions ?? 40} questões`, type: "questions" },
      { id: 81003, day: 1, topic: currentTopic, meta: "15 cards de recuperação", type: "cards" },
      { id: 81004, day: 2, topic: nextTopics[0]?.topic ?? currentTopic, meta: `${nextTopics[0]?.questions ?? 30} questões · prioridade de banca`, type: "questions" },
      { id: 81005, day: 3, topic: currentTopic, meta: "1ª revisão · 25 min", type: "review" },
      { id: 81006, day: 4, topic: nextTopics[1]?.topic ?? currentTopic, meta: `${nextTopics[1]?.questions ?? 25} questões · prioridade de banca`, type: "questions" },
      { id: 81007, day: 5, topic: currentTopic, meta: "20 cards + caderno de erros", type: "cards" },
    ];
  }, [currentTopic, priorities]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAgendaHydrated(false);
      const loadAgenda = async () => {
        const result = await supabase?.from("profile_states").select("data").eq("profile_id", profileId).eq("scope", "agenda").maybeSingle();
        const parsed = result?.data?.data;
        if (parsed) {
          setEvents(parsed.events?.length ? parsed.events : suggestedAgenda);
          setRotation(currentRotation => parsed.rotation ?? currentRotation);
        } else { setEvents(suggestedAgenda); setRotation({ area: "Nenhum rodízio cadastrado", start: "", end: "", boost: 40 }); }
        setAgendaHydrated(true);
      };
      loadAgenda();
    }, 0);
    return () => clearTimeout(timer);
  }, [profileId, suggestedAgenda]);

  useEffect(() => {
    if (!agendaHydrated || !supabase || profileId === "joao") return;
    const client = supabase;
    const timer = setTimeout(() => {
      client.from("profile_states").upsert({ profile_id: profileId, scope: "agenda", data: { events, rotation }, updated_at: new Date().toISOString() });
    }, 450);
    return () => clearTimeout(timer);
  }, [events, rotation, agendaHydrated, profileId]);

  function moveEvent(id: number, day: number) {
    setEvents(prev => prev.map(event => event.id === id ? { ...event, day } : event));
    setDragged(null);
    setToast(`Bloco movido para ${days[day][0]}. A rota foi ajustada.`);
  }

  function saveBlock() {
    if (!newBlock.topic.trim()) return setToast("Digite o assunto do novo bloco.");
    setEvents(prev => [...prev, { id: Date.now(), ...newBlock }]);
    setAddOpen(false);
    setNewBlock({ topic: "", day: 0, meta: "45 min", type: "theory" });
    setToast("Bloco incluído na agenda.");
  }

  return <div className="page-stack">
    {currentTopic && <section className="focus-banner"><div><span className="section-kicker">FOCO DA SEMANA</span><h2>{currentTopic}</h2><p>A agenda combinou este assunto com os temas de maior retorno nas bancas escolhidas.</p></div><span><Sparkles size={16} /> rotina automática</span></section>}
    <section className="rotation-banner">
      <div className="rotation-symbol"><Stethoscope size={23} /></div>
      <div className="rotation-copy"><span className="section-kicker">INTERNATO</span><h2>{rotation.area === "Nenhum rodízio cadastrado" ? rotation.area : `Rodízio de ${rotation.area}`}</h2><p>{rotation.area === "Nenhum rodízio cadastrado" ? "Informe sua área e o período para o GPS aproximar teoria e prática." : `Durante o período escolhido, ${rotation.boost}% da carga flexível será direcionada ao rodízio.`}</p></div>
      <div className="rotation-balance"><div><i style={{ width: `${rotation.boost}%` }} /></div><span><b>{rotation.boost}%</b> internato <b>{100 - rotation.boost}%</b> prova</span></div>
      <button className="outline-button" onClick={() => setRotationOpen(true)}><Settings size={16} /> Editar rodízio</button>
    </section>

    <section className="panel agenda-panel">
      <div className="agenda-toolbar"><div><h2>Semana de 10 a 16 de agosto</h2><p>Arraste os blocos entre os dias ou use as setas. A agenda recalcula o restante.</p></div><div><button className="week-arrow" aria-label="Semana anterior"><ChevronRight size={17} /></button><button className="week-arrow next" aria-label="Próxima semana"><ChevronRight size={17} /></button><button className="primary-button" onClick={() => setAddOpen(true)}><Plus size={16} /> Adicionar bloco</button></div></div>
      <div className="interactive-week">
        {days.map((day, dayIndex) => <div className={`day-column ${dayIndex === 0 ? "today" : ""}`} key={day[0]} onDragOver={event => event.preventDefault()} onDrop={() => dragged && moveEvent(dragged, dayIndex)}>
          <header><span>{day[0]}</span><strong>{day[1]}</strong>{dayIndex === 0 && <b>HOJE</b>}</header>
          <div className="day-events">
            {events.filter(event => event.day === dayIndex).map(event => <article className={`agenda-event ${event.type}`} draggable key={event.id} onDragStart={() => setDragged(event.id)}>
              <div className="event-top"><GripVertical size={13} /><span>{event.type === "rotation" ? "RODÍZIO" : event.type === "cards" ? "FLASHCARDS" : event.type === "review" ? "REVISÃO" : event.type === "questions" ? "QUESTÕES" : "TEORIA"}</span></div>
              <strong>{event.topic}</strong><small>{event.meta}</small>
              <div className="event-move"><button disabled={dayIndex === 0} onClick={() => moveEvent(event.id, dayIndex - 1)} aria-label="Mover para o dia anterior">‹</button><button disabled={dayIndex === 6} onClick={() => moveEvent(event.id, dayIndex + 1)} aria-label="Mover para o próximo dia">›</button></div>
            </article>)}
            <button className="day-add" onClick={() => { setNewBlock(prev => ({ ...prev, day: dayIndex })); setAddOpen(true); }}><Plus size={14} /> adicionar</button>
          </div>
          <footer>{events.filter(event => event.day === dayIndex).length ? `${events.filter(event => event.day === dayIndex).length} blocos` : "Livre"}</footer>
        </div>)}
      </div>
    </section>

    <div className="three-cards"><MetricCard icon={<Gauge />} label="Carga planejada" value={events.length ? "4h" : "0h"} note={events.length ? `${events.length} blocos nesta semana` : "agenda vazia"} /><MetricCard icon={<Stethoscope />} label="Foco do internato" value={rotation.area === "Nenhum rodízio cadastrado" ? "—" : rotation.area} note={rotation.area === "Nenhum rodízio cadastrado" ? "rodízio não definido" : `${rotation.boost}% da carga flexível`} /><MetricCard icon={<Layers3 />} label="Flashcards" value={currentTopic ? "15/dia" : "0/dia"} note={currentTopic ? `foco em ${currentTopic}` : "sem assunto atual"} /></div>

    {rotationOpen && <div className="modal-backdrop" onMouseDown={() => setRotationOpen(false)}><div className="modal compact" role="dialog" aria-modal="true" aria-label="Editar rodízio" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">SINCRONIZAR INTERNATO</span><h2>Qual é seu rodízio atual?</h2><p>O GPS aproxima o conteúdo da sua prática sem abandonar o plano da prova.</p></div><button className="icon-button" onClick={() => setRotationOpen(false)}><X size={20} /></button></div><div className="rotation-form"><label>Área<select value={rotation.area} onChange={e => setRotation({ ...rotation, area: e.target.value })}><option>Nenhum rodízio cadastrado</option><option>Ginecologia e Obstetrícia</option><option>Clínica Médica</option><option>Cirurgia</option><option>Pediatria</option><option>Saúde Coletiva</option><option>Emergência</option></select></label><div className="two-fields"><label>Início<input type="date" value={rotation.start} onChange={e => setRotation({ ...rotation, start: e.target.value })} /></label><label>Fim<input type="date" value={rotation.end} onChange={e => setRotation({ ...rotation, end: e.target.value })} /></label></div><label className="range-label"><span><b>Quanto priorizar o rodízio?</b><strong>{rotation.boost}%</strong></span><input type="range" min="20" max="70" step="5" value={rotation.boost} onChange={e => setRotation({ ...rotation, boost: Number(e.target.value) })} /><small>O restante continua direcionado à incidência das suas bancas.</small></label></div><div className="modal-actions"><button className="text-button" onClick={() => setRotationOpen(false)}>Cancelar</button><button className="primary-button" onClick={() => { setRotationOpen(false); setToast(rotation.area === "Nenhum rodízio cadastrado" ? "Rodízio configurado como vazio." : `Rodízio de ${rotation.area} sincronizado com a agenda.`); }}><RefreshCw size={16} /> Aplicar à agenda</button></div></div></div>}

    {addOpen && <div className="modal-backdrop" onMouseDown={() => setAddOpen(false)}><div className="modal compact" role="dialog" aria-modal="true" aria-label="Adicionar bloco" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">AGENDA LIVRE</span><h2>Novo bloco de estudo</h2><p>Você poderá movê-lo novamente quando quiser.</p></div><button className="icon-button" onClick={() => setAddOpen(false)}><X size={20} /></button></div><label className="plain-field">Assunto<input value={newBlock.topic} onChange={e => setNewBlock({ ...newBlock, topic: e.target.value })} placeholder="Ex.: Rotura prematura de membranas" /></label><div className="two-fields"><label>Dia<select value={newBlock.day} onChange={e => setNewBlock({ ...newBlock, day: Number(e.target.value) })}>{days.map((day, index) => <option value={index} key={day[0]}>{day[0]}, {day[1]} ago</option>)}</select></label><label>Tipo<select value={newBlock.type} onChange={e => setNewBlock({ ...newBlock, type: e.target.value as AgendaEvent["type"] })}><option value="theory">Teoria</option><option value="questions">Questões</option><option value="review">Revisão</option><option value="cards">Flashcards</option></select></label></div><label className="plain-field">Duração ou volume<input value={newBlock.meta} onChange={e => setNewBlock({ ...newBlock, meta: e.target.value })} placeholder="Ex.: 30 questões · 50 min" /></label><div className="modal-actions"><button className="text-button" onClick={() => setAddOpen(false)}>Cancelar</button><button className="primary-button" onClick={saveBlock}><Plus size={16} /> Adicionar à agenda</button></div></div></div>}
  </div>;
}

function FlashcardsPage({ logs, dailyCards, setToast, profileId, studiedTopics, onOpenTopics }: { logs: QuestionLog[]; dailyCards: number; setToast: (message: string) => void; profileId: string; studiedTopics: string[]; onOpenTopics: () => void }) {
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [xp, setXp] = useState(320);
  const [lastRating, setLastRating] = useState("");
  const [cardsHydrated, setCardsHydrated] = useState(false);
  const studiedTitles = topicBank.filter(topic => studiedTopics.includes(topic.id)).map(topic => topic.title);
  const preparedCards = medicalCardDeck.filter(card => studiedTitles.includes(card.topic));
  const generatedCards = topicBank.filter(topic => studiedTopics.includes(topic.id) && !medicalCardDeck.some(card => card.topic === topic.title)).map(topic => ({ topic: topic.title, area: topic.area, front: `Quais são os pontos essenciais para dominar ${topic.title}?`, back: "Revise definição, classificação, apresentação clínica, diagnóstico, conduta, complicações e os principais diferenciais cobrados em prova." }));
  const activeDeck = [...preparedCards, ...generatedCards];
  const card = activeDeck[current % Math.max(1, activeDeck.length)];
  const progress = Math.min(100, Math.round((answered / dailyCards) * 100));

  useEffect(() => {
    const timer = setTimeout(() => {
      setCardsHydrated(false);
      const loadCards = async () => {
        const result = await supabase?.from("profile_states").select("data").eq("profile_id", profileId).eq("scope", "flashcards").maybeSingle();
        const parsed = result?.data?.data;
        if (parsed) {
          setCurrent(parsed.current ?? 0);
          setAnswered(parsed.answered ?? 0);
          setXp(parsed.xp ?? 320);
        } else { setCurrent(0); setAnswered(0); setXp(0); }
        setCardsHydrated(true);
      };
      loadCards();
    }, 0);
    return () => clearTimeout(timer);
  }, [profileId]);

  useEffect(() => {
    if (!cardsHydrated || !supabase || profileId === "joao") return;
    const client = supabase;
    const timer = setTimeout(() => {
      client.from("profile_states").upsert({ profile_id: profileId, scope: "flashcards", data: { current, answered, xp }, updated_at: new Date().toISOString() });
    }, 450);
    return () => clearTimeout(timer);
  }, [current, answered, xp, cardsHydrated, profileId]);

  function rate(label: string, points: number) {
    setAnswered(value => value + 1);
    setXp(value => value + points);
    setLastRating(label);
    setRevealed(false);
    setCurrent(value => value + 1);
    if (answered + 1 === dailyCards) setToast("Meta diária concluída! Sequência protegida e +100 XP.");
  }

  const topicRecommendations = logs.slice().sort((a,b) => a.accuracy - b.accuracy).slice(0,4).map(log => ({ ...log, cards: log.accuracy < 60 ? 10 : log.accuracy < 70 ? 7 : 4 }));

  if (!studiedTopics.length || !card) return <div className="page-stack"><section className="fresh-empty hero-empty"><div className="fresh-empty-icon"><Layers3 size={30} /></div><span className="section-kicker">FILA ZERADA</span><h2>Nenhum flashcard agendado ainda</h2><p>Como este perfil está começando do zero, o GPS só recomendará cards depois que você marcar ao menos um assunto como estudado.</p><button className="primary-button" onClick={onOpenTopics}><LibraryBig size={17} /> Escolher primeiro assunto</button></section><section className="panel"><div className="panel-title"><div><h2>Banco inicial de flashcards</h2><p>Já existem cards preparados a partir dos temas que você enviou.</p></div><span className="status-pill">{medicalCardDeck.length} cards iniciais</span></div><div className="deck-preview">{medicalCardDeck.slice(0,8).map(item => <article key={`${item.area}-${item.topic}`}><span>{item.area}</span><strong>{item.topic}</strong><small>{item.front}</small></article>)}</div></section></div>;

  return <div className="page-stack">
    <section className="cards-hero">
      <div><span className="cards-level"><Zap size={14} fill="currentColor" /> NÍVEL 1 · {xp} XP</span><h2>Seu cérebro aprende melhor em pequenas vitórias.</h2><p>Hoje o GPS selecionou <strong>{dailyCards} cards</strong> a partir dos assuntos já estudados e do seu desempenho em questões.</p><div className="daily-progress"><div><i style={{ width: `${progress}%` }} /></div><span><b>{answered}</b> de {dailyCards} concluídos</span></div></div>
      <div className="streak-orbit"><FlameIcon /><strong>0</strong><span>dias seguidos</span></div>
    </section>

    <section className="flash-layout">
      <div className="flash-session">
        <div className="flash-session-top"><div><span className="topic-chip">{card.area}</span><small>{card.topic}</small></div><span>{Math.min(answered + 1, dailyCards)} / {dailyCards}</span></div>
        <button className={`flash-card ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)} aria-label={revealed ? "Resposta revelada" : "Revelar resposta"}>
          <div className="card-face question-face"><BookMarked size={27} /><span>PERGUNTA</span><h3>{card.front}</h3>{!revealed && <em>Clique para revelar a resposta</em>}</div>
          {revealed && <div className="answer-box"><span>RESPOSTA</span><p>{card.back}</p></div>}
        </button>
        {!revealed ? <button className="reveal-button" onClick={() => setRevealed(true)}><Sparkles size={17} /> Mostrar resposta</button> : <div className="rating-area"><p>Como foi lembrar deste conteúdo?</p><div><button className="hard" onClick={() => rate("Difícil", 12)}><Frown size={20} /><span><b>Difícil</b><small>rever amanhã</small></span></button><button className="medium" onClick={() => rate("Médio", 18)}><Meh size={20} /><span><b>Médio</b><small>rever em 4 dias</small></span></button><button className="easy" onClick={() => rate("Fácil", 24)}><Smile size={20} /><span><b>Fácil</b><small>rever em 12 dias</small></span></button></div></div>}
        {lastRating && <div className="micro-reward"><Zap size={14} /> Último card: {lastRating}. O intervalo já foi recalculado.</div>}
      </div>

      <aside className="cards-sidebar">
        <div className="panel"><div className="panel-title"><div><h2>Por que estes cards?</h2><p>Mais cards para percentuais menores.</p></div></div><div className="recommend-list">{topicRecommendations.map(item => <article key={item.id}><div><strong>{item.topic}</strong><span>{item.questions} questões · {item.accuracy}% de acerto</span></div><b>{item.cards}<small> cards</small></b></article>)}</div></div>
        <div className="panel interval-legend"><h2>Repetição adaptativa</h2><p><span className="dot hard" /> Difícil: alta frequência</p><p><span className="dot medium" /> Médio: frequência moderada</p><p><span className="dot easy" /> Fácil: menor frequência</p></div>
      </aside>
    </section>
  </div>;
}

function QuestionsPage({ logs, setLogs, setToast, setStudiedTopics }: { logs: QuestionLog[]; setLogs: React.Dispatch<React.SetStateAction<QuestionLog[]>>; setToast: (message: string) => void; setStudiedTopics: React.Dispatch<React.SetStateAction<string[]>> }) {
  const [form, setForm] = useState({ topic: "", area: "Ginecologia e Obstetrícia", questions: 20, accuracy: 60 });
  const total = logs.reduce((sum, log) => sum + log.questions, 0);
  const weighted = total ? Math.round(logs.reduce((sum, log) => sum + log.questions * log.accuracy, 0) / total) : 0;
  const weakest = logs.slice().sort((a,b) => a.accuracy - b.accuracy)[0];

  function saveLog() {
    if (!form.topic.trim()) return setToast("Informe o assunto das questões.");
    setLogs(prev => [{ id: Date.now(), topic: form.topic, area: form.area === "Ginecologia e Obstetrícia" ? "GO" : form.area, questions: form.questions, accuracy: form.accuracy, date: "Hoje" }, ...prev]);
    const matched = topicBank.find(topic => topic.title.toLocaleLowerCase("pt-BR") === form.topic.trim().toLocaleLowerCase("pt-BR"));
    if (matched) setStudiedTopics(prev => prev.includes(matched.id) ? prev : [...prev, matched.id]);
    setForm({ ...form, topic: "" });
    setToast("Desempenho salvo. Flashcards e agenda diária recalculados.");
  }

  return <div className="page-stack">
    <div className="three-cards"><MetricCard icon={<ListChecks />} label="Questões registradas" value={String(total)} note="base do plano adaptativo" /><MetricCard icon={<Target />} label="Acerto ponderado" value={`${weighted}%`} note="considera o volume feito" /><MetricCard icon={<BrainCircuit />} label="Maior oportunidade" value={weakest?.accuracy ? `${weakest.accuracy}%` : "—"} note={weakest?.topic ?? "sem dados"} /></div>
    <section className="question-grid">
      <div className="panel log-form-panel"><div className="panel-title"><div><h2>Registrar desempenho</h2><p>Digite quantas questões fez e seu percentual de acerto.</p></div></div><label className="plain-field">Assunto<input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Ex.: Diabetes gestacional" /></label><div className="two-fields"><label>Grande área<select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}><option>Ginecologia e Obstetrícia</option><option>Clínica Médica</option><option>Cirurgia</option><option>Pediatria</option><option>Preventiva</option></select></label><label>Quantidade<input type="number" min="1" value={form.questions} onChange={e => setForm({ ...form, questions: Number(e.target.value) })} /></label></div><label className="accuracy-slider"><span><b>Percentual de acerto</b><strong>{form.accuracy}%</strong></span><input type="range" min="0" max="100" value={form.accuracy} onChange={e => setForm({ ...form, accuracy: Number(e.target.value) })} /><div><span>Precisa reforçar</span><span>Domínio alto</span></div></label><div className="calculation-preview"><BrainCircuit size={20} /><div><strong>Impacto no plano</strong><p>{form.accuracy < 60 ? "Alta prioridade: o tema receberá mais questões e flashcards frequentes." : form.accuracy < 75 ? "Prioridade moderada: revisões e flashcards em intervalos médios." : "Consolidação: menos repetições, preservando revisões espaçadas."}</p></div></div><button className="primary-button save-log" onClick={saveLog}><Check size={17} /> Salvar e recalcular</button></div>
      <div className="panel"><div className="panel-title"><div><h2>Histórico por assunto</h2><p>Os registros mais recentes aparecem primeiro.</p></div></div>{logs.length ? <div className="log-list">{logs.map(log => <article key={log.id}><div className={`log-score ${log.accuracy < 60 ? "low" : log.accuracy < 75 ? "mid" : "high"}`}><strong>{log.accuracy}%</strong><span>acerto</span></div><div><strong>{log.topic}</strong><span>{log.area} · {log.date}</span></div><div className="log-volume"><b>{log.questions}</b><span>questões</span></div><div className="card-suggestion"><Layers3 size={14} /><b>{log.accuracy < 60 ? 10 : log.accuracy < 70 ? 7 : 4}</b><span>cards/dia</span></div></article>)}</div> : <EmptyMini icon={<ListChecks size={22} />} title="Nenhuma questão registrada" text="Este perfil ainda não tem histórico." />}</div>
    </section>
  </div>;
}

function TopicsPage({ studiedTopics, setStudiedTopics, setToast, currentTopic, setCurrentTopic }: { studiedTopics: string[]; setStudiedTopics: React.Dispatch<React.SetStateAction<string[]>>; setToast: (message: string) => void; currentTopic: string; setCurrentTopic: (topic: string) => void }) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState<"Todas" | StudyTopic["area"]>("Todas");
  const areas: Array<"Todas" | StudyTopic["area"]> = ["Todas", "Cirurgia", "Ginecologia e Obstetrícia", "Clínica Médica", "Pediatria", "Preventiva"];
  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = topicBank.filter(topic => (area === "Todas" || topic.area === area) && (!normalized || topic.title.toLocaleLowerCase("pt-BR").includes(normalized)));

  function toggleTopic(topic: StudyTopic) {
    const isStudied = studiedTopics.includes(topic.id);
    setStudiedTopics(prev => isStudied ? prev.filter(id => id !== topic.id) : [...prev, topic.id]);
    setToast(isStudied ? `${topic.title} voltou para “Não estudado”.` : `${topic.title} marcado como estudado. Flashcards liberados.`);
  }

  return <div className="page-stack">
    <div className="topic-summary">
      <div><LibraryBig size={23} /><span><strong>{topicBank.length}</strong><small>assuntos cadastrados</small></span></div>
      <div><BookOpenCheck size={23} /><span><strong>{studiedTopics.length}</strong><small>estudados</small></span></div>
      <div><Layers3 size={23} /><span><strong>{medicalCardDeck.length}</strong><small>cards no banco</small></span></div>
    </div>
    <section className={`current-focus-card ${currentTopic ? "configured" : ""}`}><div><MapPinned size={23} /><span><small>ASSUNTO QUE ESTÁ ESTUDANDO AGORA</small><strong>{currentTopic || "Ainda não definido"}</strong><p>Escolha “Usar como foco” em qualquer assunto. O GPS montará a semana automaticamente.</p></span></div>{currentTopic && <button onClick={() => setCurrentTopic("")}>Limpar foco</button>}</section>
    <section className="panel topics-panel">
      <div className="topics-toolbar"><div className="topic-search"><Search size={18} /><input aria-label="Buscar assunto" placeholder="Buscar assunto..." value={search} onChange={event => setSearch(event.target.value)} /></div><div className="area-filters">{areas.map(item => <button className={area === item ? "active" : ""} key={item} onClick={() => setArea(item)}>{item}</button>)}</div></div>
      <div className="topics-head"><span>{filtered.length} assuntos encontrados</span><small>Todos começaram como “Não estudado”</small></div>
      <div className="topics-list">{filtered.map(topic => { const studied = studiedTopics.includes(topic.id); const focused = currentTopic === topic.title; return <article className={focused ? "focused-topic" : ""} key={topic.id}><div className={`topic-state ${studied ? "studied" : ""}`}>{studied ? <Check size={16} /> : <BookMarked size={16} />}</div><div><span>{topic.area}</span><strong>{topic.title}</strong></div><em className={studied ? "studied" : ""}>{studied ? "Estudado" : "Não estudado"}</em><div className="topic-actions"><button className={focused ? "focus-active" : ""} onClick={() => { setCurrentTopic(topic.title); setToast(`${topic.title} virou o foco da sua rotina.`); }}>{focused ? "Foco atual" : "Usar como foco"}</button><button onClick={() => toggleTopic(topic)}>{studied ? "Desmarcar" : "Marcar estudado"}</button></div></article>})}</div>
    </section>
  </div>;
}

function PrioritiesPage({ banks, priorities, onConfigure }: { banks: BankWeights; priorities: PrioritySuggestion[]; onConfigure: () => void }) {
  const selected = bankPriorities.filter(bank => banks[bank.key] > 0);
  return <div className="page-stack">
    <section className="methodology-banner"><div><ShieldCheck size={24} /><span><strong>Prioridade estimada, não promessa de incidência</strong><p>O ranking cruza levantamentos de provas recentes com os pesos escolhidos. A banca pode mudar; por isso o GPS também aprende com suas questões ao longo do ano.</p></span></div><button className="outline-button" onClick={onConfigure}><Settings size={16} /> Ajustar pesos</button></section>
    {priorities.length > 0 && <section className="panel composite-priority"><div className="panel-title"><div><span className="section-kicker">SEU MIX DE BANCAS</span><h2>Ranking combinado da sua rota</h2><p>{selected.map(bank => `${bank.name} ${banks[bank.key]}%`).join(" · ")}</p></div></div><div className="composite-grid">{priorities.slice(0, 8).map(item => <article key={item.topic}><b>{item.rank}</b><div><span>{item.area}</span><strong>{item.topic}</strong><small>{item.questions} questões sugeridas · sinal mais forte: {item.sourceBank}</small></div><em>{Math.round(item.score)}</em></article>)}</div></section>}
    <section className="bank-priority-grid">{bankPriorities.map(bank => <article className={`panel bank-priority-card ${banks[bank.key] ? "selected" : ""}`} key={bank.key}><header><div><span>{bank.short}</span><h2>{bank.name}</h2></div>{banks[bank.key] > 0 && <b>{banks[bank.key]}% no plano</b>}</header><p>{bank.style}</p><ol>{bank.topics.map((topic, index) => <li key={`${bank.key}-${topic}`}><span>{index + 1}</span><strong>{topic}</strong></li>)}</ol><a href={bank.sourceUrl} target="_blank" rel="noreferrer">Ver {bank.sourceLabel} <ChevronRight size={15} /></a></article>)}</section>
  </div>;
}

function FlameIcon() { return <div className="flame-icon"><Zap size={24} fill="currentColor" /></div>; }

function PerformancePage({ probability, hasData, logs }: { probability: number; hasData: boolean; logs: QuestionLog[] }) {
  if (!hasData) return <div className="page-stack"><div className="three-cards"><MetricCard icon={<Target />} label="GPS Score" value="0%" note="partida assumida do zero" /><MetricCard icon={<Activity />} label="Acerto global" value="—" note="nenhuma questão" /><MetricCard icon={<Trophy />} label="Nota projetada" value="0%" note="cresce com seus registros" /></div><section className="fresh-empty"><div className="fresh-empty-icon"><BarChart3 size={28} /></div><h2>Você não precisa fazer avaliação inicial</h2><p>Comece pela rotina sugerida. Cada bloco de questões concluído ensina ao GPS onde aumentar ou reduzir a carga.</p></section></div>;
  const total = logs.reduce((sum, log) => sum + log.questions, 0);
  const weighted = total ? Math.round(logs.reduce((sum, log) => sum + log.questions * log.accuracy, 0) / total) : 0;
  const ranked = logs.slice().sort((a,b) => a.accuracy - b.accuracy);
  return <div className="page-stack"><div className="three-cards"><MetricCard icon={<Target />} label="GPS Score" value={`${probability}%`} note="estimativa inicial" /><MetricCard icon={<Activity />} label="Acerto global" value={`${weighted}%`} note={`${total} questões registradas`} /><MetricCard icon={<Trophy />} label="Nota projetada" value="—" note="em calibração" /></div><div className="panel priority-panel"><div className="panel-title"><div><h2>Prioridades pelos seus registros</h2><p>Menor desempenho recebe mais atenção.</p></div></div><div className="topic-table-wrap"><table className="topic-table"><thead><tr><th>TEMA</th><th>ÁREA</th><th>ACERTO</th><th>PRÓXIMO VOLUME</th></tr></thead><tbody>{ranked.map((log,i)=><tr key={log.id}><td><b className="rank">{i+1}</b><div><strong>{log.topic}</strong><span>{log.date}</span></div></td><td><strong>{log.area}</strong></td><td><span className={`accuracy ${log.accuracy < 60 ? "low" : ""}`}>{log.accuracy}%</span></td><td><strong>{log.accuracy < 60 ? 40 : log.accuracy < 75 ? 25 : 15} questões</strong></td></tr>)}</tbody></table></div></div></div>;
}

function SimuladosPage() {
  return <div className="page-stack"><div className="three-cards"><MetricCard icon={<ClipboardCheck />} label="Provas cadastradas" value="0" note="nenhum simulado" /><MetricCard icon={<TrendingUp />} label="Melhor resultado" value="—" note="sem dados" /><MetricCard icon={<BrainCircuit />} label="Nota ajustada" value="—" note="sem comparação" /></div><section className="fresh-empty"><div className="fresh-empty-icon"><ClipboardCheck size={28} /></div><h2>Nenhum simulado cadastrado</h2><p>Quando você fizer a primeira prova completa, o resultado aparecerá aqui.</p></section></div>;
}

function ReviewsPage() {
  return <div className="page-stack"><div className="review-hero"><div><CalendarClock size={26} /><span><b>0 revisões</b><small>agendadas</small></span></div><div><Clock3 size={26} /><span><b>0h</b><small>tempo estimado</small></span></div><div><BrainCircuit size={26} /><span><b>—</b><small>retenção estimada</small></span></div></div><section className="fresh-empty"><div className="fresh-empty-icon"><CalendarClock size={28} /></div><h2>Sua fila de revisão está vazia</h2><p>Marque um assunto como estudado para criar a primeira revisão.</p></section></div>;
}

function GoalsPage({ banks, target, currentTopic, onEdit }: { banks: BankWeights; target:number; currentTopic: string; onEdit:()=>void }) {
  const configuredBanks = bankPriorities.filter(bank => banks[bank.key] > 0);
  const total = Object.values(banks).reduce((sum, value) => sum + value, 0);
  return <div className="page-stack"><div className="goal-hero"><div><span className="section-kicker">SUPER PLANNER PERSONALIZADO</span><h2>{configuredBanks.length ? configuredBanks.map(bank => `${bank.name} ${banks[bank.key]}%`).join(", ") : "Nenhuma banca configurada"}</h2><p>{configuredBanks.length ? `Foco atual: ${currentTopic || "a definir"}. A rotina combina incidência e desempenho sem exigir prova diagnóstica.` : "Escolha as bancas e distribua 100% dos pesos para iniciar seu plano."}</p><button className="primary-button" onClick={onEdit}><Settings size={17}/> Configurar composição</button></div><div className="donut empty-donut"><div><strong>{total}%</strong><span>direcionado</span></div></div></div><div className="three-cards"><MetricCard icon={<Target/>} label="Meta principal" value={target ? `${target}%` : "—"} note={target ? "nota desejada" : "não definida"}/><MetricCard icon={<Flag/>} label="Data da prova" value="—" note="não informada"/><MetricCard icon={<GraduationCap/>} label="Ponto de partida" value="0%" note="conhecimento inicial assumido"/></div></div>;
}

function MetricCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <article className="metric-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

function EmptyMini({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="empty-mini"><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></div>;
}
