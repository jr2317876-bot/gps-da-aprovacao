"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Cloud,
  CloudUpload,
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
  Pencil,
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
  Trash2,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { bankPriorities, examFocusedCardDeck, medicalCardDeck, topicBank, type BankKey, type StudyTopic } from "./topics";
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

type CustomFlashcard = {
  id: number;
  topic: string;
  area: StudyTopic["area"];
  front: string;
  back: string;
  createdAt: string;
};

type MockExamError = {
  id: number;
  topic: string;
  area: StudyTopic["area"];
  note: string;
  correction: string;
};

type MockExamRecord = {
  id: number;
  bank: string;
  year: number;
  date: string;
  correct: number;
  total: number;
  errors: MockExamError[];
};

type AgendaEvent = {
  id: number;
  day: number;
  topic: string;
  meta: string;
  type: "rotation" | "questions" | "review" | "cards" | "theory" | "materials" | "mock" | "correction";
  completed?: boolean;
  studied?: boolean;
};

type RotationState = { area: string; start: string; end: string; boost: number };

type MentorshipCheckin = {
  id: number;
  date: string;
  lessonsDone: number;
  lessonGoal: number;
  questionsDone: number;
  questionGoal: number;
  adherence: number;
  accuracy: number | null;
  feedback: string;
};

type ResidencySpecialty = "Neurologia" | "Clínica Médica" | "Cirurgia Geral" | "Oftalmologia" | "Otorrinolaringologia" | "Radiologia";
type ResidencyProgram = {
  id: string;
  institution: string;
  hospital: string;
  location: string;
  process: string;
  scale: "0–10" | "0–100" | "0–1000";
  year: number;
  profile: string;
  sourceUrl: string;
  cutoffs: Record<ResidencySpecialty, number>;
};

type Profile = { id: string; name: string; color: string };
type BankWeights = Record<BankKey, number>;
type PrioritySuggestion = { topic: string; area: StudyTopic["area"]; score: number; rank: number; questions: number; sourceBank: string };
type FocusArea = StudyTopic["area"] | "";
type SaveStatus = "loading" | "saving" | "saved" | "error";
type MainCloudState = {
  done?: number[]; target?: number; hours?: number; safety?: number; banks?: Partial<BankWeights>;
  questionLogs?: QuestionLog[]; studiedTopics?: string[]; focusArea?: FocusArea; weeklyTopics?: string[];
  currentTopic?: string; recalculated?: boolean; mockExams?: MockExamRecord[]; focusPercentage?: number; mockExamCadence?: 3 | 4;
  weeklyLessonGoal?: number; weeklyQuestionGoal?: number; mentorshipCheckins?: MentorshipCheckin[];
};

const DEFAULT_PROFILES: Profile[] = [{ id: "joao", name: "João", color: "#0f8f77" }];
const DEFAULT_BANKS: BankWeights = { sespe: 0, enare: 0, sussp: 0, psumg: 0, uspsp: 0, usprp: 0, unicamp: 0, unifesp: 0, iamspe: 0 };
const STUDY_AREAS: StudyTopic["area"][] = ["Clínica Médica", "Cirurgia", "Ginecologia e Obstetrícia", "Pediatria", "Preventiva"];
const RESIDENCY_SPECIALTIES: ResidencySpecialty[] = ["Neurologia", "Clínica Médica", "Cirurgia Geral", "Oftalmologia", "Otorrinolaringologia", "Radiologia"];
const residencyPrograms: ResidencyProgram[] = [
  {
    id: "usp-sp", institution: "USP-SP", hospital: "Hospital das Clínicas da FMUSP", location: "São Paulo · SP", process: "Seleção própria", scale: "0–100", year: 2026,
    profile: "Hospital universitário de alta complexidade, forte ambiente acadêmico e ampla rede de institutos.",
    sourceUrl: "https://www.grupomedcof.com.br/blog/notas-de-corte-de-residencia-medica-de-sao-paulo/",
    cutoffs: { "Neurologia": 82, "Clínica Médica": 83, "Cirurgia Geral": 85, "Oftalmologia": 85, "Otorrinolaringologia": 86, "Radiologia": 80 },
  },
  {
    id: "usp-rp", institution: "USP-RP", hospital: "Hospital das Clínicas de Ribeirão Preto", location: "Ribeirão Preto · SP", process: "Seleção própria", scale: "0–10", year: 2026,
    profile: "Hospital universitário terciário com integração entre assistência, ensino e pesquisa.",
    sourceUrl: "https://www.grupomedcof.com.br/blog/notas-de-corte-de-residencia-medica-de-sao-paulo/",
    cutoffs: { "Neurologia": 7.2, "Clínica Médica": 7, "Cirurgia Geral": 7.2, "Oftalmologia": 7.2, "Otorrinolaringologia": 7.4, "Radiologia": 6.6 },
  },
  {
    id: "unicamp", institution: "UNICAMP", hospital: "Hospital de Clínicas da UNICAMP", location: "Campinas · SP", process: "Seleção própria", scale: "0–10", year: 2026,
    profile: "Centro universitário terciário com rede de referência regional e formação acadêmico-assistencial.",
    sourceUrl: "https://www.grupomedcof.com.br/blog/notas-de-corte-de-residencia-medica-de-sao-paulo/",
    cutoffs: { "Neurologia": 7.7, "Clínica Médica": 7.3, "Cirurgia Geral": 7.7, "Oftalmologia": 7.8, "Otorrinolaringologia": 7.5, "Radiologia": 7.5 },
  },
  {
    id: "iamspe", institution: "IAMSPE", hospital: "Hospital do Servidor Público Estadual", location: "São Paulo · SP", process: "Seleção IAMSPE", scale: "0–10", year: 2026,
    profile: "Hospital geral de grande porte ligado à rede assistencial dos servidores públicos estaduais.",
    sourceUrl: "https://www.grupomedcof.com.br/blog/notas-de-corte-de-residencia-medica-de-sao-paulo/",
    cutoffs: { "Neurologia": 8.5, "Clínica Médica": 8.4, "Cirurgia Geral": 8.6, "Oftalmologia": 8.6, "Otorrinolaringologia": 8.7, "Radiologia": 8.3 },
  },
  {
    id: "sus-sp", institution: "SUS-SP", hospital: "Rede de instituições participantes", location: "Estado de São Paulo", process: "SUS-SP", scale: "0–100", year: 2026,
    profile: "Processo unificado: o cenário formativo muda conforme o hospital escolhido e a posição na classificação.",
    sourceUrl: "https://www.grupomedcof.com.br/blog/notas-de-corte-de-residencia-medica-de-sao-paulo/",
    cutoffs: { "Neurologia": 76, "Clínica Médica": 69, "Cirurgia Geral": 72, "Oftalmologia": 76, "Otorrinolaringologia": 76, "Radiologia": 73 },
  },
  {
    id: "hgf-enare", institution: "HGF · ENARE", hospital: "Hospital Geral de Fortaleza", location: "Fortaleza · CE", process: "ENARE", scale: "0–1000", year: 2026,
    profile: "Hospital público terciário; referência útil para comparar programas de alta procura dentro do ENARE.",
    sourceUrl: "https://www.grupomedcof.com.br/blog/notas-de-corte-enare/",
    cutoffs: { "Neurologia": 890, "Clínica Médica": 870, "Cirurgia Geral": 900, "Oftalmologia": 935, "Otorrinolaringologia": 910, "Radiologia": 880 },
  },
];

const initialTasks: Task[] = [
  { id: 1, area: "CONFIGURAÇÃO", topic: "Escolher bancas e definir a meta", kind: "Primeiro passo", duration: 10, questions: 1, unit: "etapa", reason: "A incidência das bancas define o que vem primeiro", color: "purple" },
  { id: 2, area: "FOCO SEMANAL", topic: "Definir a grande área desta semana", kind: "Partida do zero", duration: 5, questions: 1, unit: "área", reason: "Dentro da área, as bancas determinam a ordem dos assuntos", color: "blue" },
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
  ["Mentoria", GraduationCap],
  ["Hospitais", Stethoscope],
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
  const [focusArea, setFocusArea] = useState<FocusArea>("");
  const [focusPercentage, setFocusPercentage] = useState(70);
  const [mockExamCadence, setMockExamCadence] = useState<3 | 4>(4);
  const [weeklyTopics, setWeeklyTopics] = useState<string[]>([]);
  const [plannerTopicDraft, setPlannerTopicDraft] = useState("");
  const [recalculated, setRecalculated] = useState(false);
  const [questionLogs, setQuestionLogs] = useState<QuestionLog[]>([]);
  const [mockExams, setMockExams] = useState<MockExamRecord[]>([]);
  const [studiedTopics, setStudiedTopics] = useState<string[]>([]);
  const [agendaPreview, setAgendaPreview] = useState<AgendaEvent[]>([]);
  const [agendaRotation, setAgendaRotation] = useState<RotationState>({ area: "Nenhum rodízio cadastrado", start: "", end: "", boost: 40 });
  const [agendaSuggestionKey, setAgendaSuggestionKey] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState("joao");
  const [profileOpen, setProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [appReady, setAppReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [todayIndex, setTodayIndex] = useState(0);
  const [weeklyLessonGoal, setWeeklyLessonGoal] = useState(4);
  const [weeklyQuestionGoal, setWeeklyQuestionGoal] = useState(60);
  const [mentorshipCheckins, setMentorshipCheckins] = useState<MentorshipCheckin[]>([]);
  const mainSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const agendaHomeSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const activeProfile = profiles.find(profile => profile.id === activeProfileId) ?? profiles[0] ?? DEFAULT_PROFILES[0];
  const handleAgendaChange = useCallback((events: AgendaEvent[], rotation: RotationState, suggestionKey: string) => { setAgendaPreview(events); setAgendaRotation(rotation); setAgendaSuggestionKey(suggestionKey); }, []);

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
      setSaveStatus("loading");
      const loadCloudState = async () => {
        const result = await supabase?.from("profile_states").select("data").eq("profile_id", activeProfileId).eq("scope", "main").maybeSingle();
        const localKey = `gps-main-state-${ownerId}-${activeProfileId}`;
        let localData: MainCloudState | null = null;
        try { localData = JSON.parse(localStorage.getItem(localKey) ?? "null") as MainCloudState | null; } catch { localData = null; }
        const parsed = (result?.data?.data as MainCloudState | undefined) ?? localData;
        if (parsed) {
          setDone(parsed.done ?? []); setTarget(parsed.target ?? 0); setHours(parsed.hours ?? 0); setSafety(parsed.safety ?? 0);
          setBanks({ ...DEFAULT_BANKS, ...(parsed.banks ?? {}) }); setQuestionLogs(parsed.questionLogs ?? []);
          setStudiedTopics(parsed.studiedTopics ?? []);
          const legacyTopic = typeof parsed.currentTopic === "string" ? parsed.currentTopic : "";
          const legacyArea = topicBank.find(topic => topic.title === legacyTopic)?.area ?? "";
          setFocusArea((parsed.focusArea ?? legacyArea) as FocusArea);
          setFocusPercentage(parsed.focusPercentage ?? 70);
          setMockExamCadence(parsed.mockExamCadence ?? 4);
          setWeeklyTopics(parsed.weeklyTopics ?? (legacyTopic ? [legacyTopic] : []));
          setMockExams(parsed.mockExams ?? []);
          setWeeklyLessonGoal(parsed.weeklyLessonGoal ?? 4);
          setWeeklyQuestionGoal(parsed.weeklyQuestionGoal ?? 60);
          setMentorshipCheckins(parsed.mentorshipCheckins ?? []);
          setRecalculated(parsed.recalculated ?? false);
        } else {
          setDone([]); setTarget(0); setHours(0); setSafety(0); setBanks(DEFAULT_BANKS);
          setQuestionLogs([]); setStudiedTopics([]); setFocusArea(""); setFocusPercentage(70); setMockExamCadence(4); setWeeklyTopics([]); setMockExams([]); setWeeklyLessonGoal(4); setWeeklyQuestionGoal(60); setMentorshipCheckins([]); setRecalculated(false);
        }
        setHydrated(true);
        setSaveStatus(result?.error ? "error" : "saved");
        if (result?.error) setToast(`Não foi possível carregar a nuvem; usando a cópia deste aparelho. ${result.error.message}`);
      };
      loadCloudState();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeProfileId, appReady, ownerId]);

  useEffect(() => {
    if (!appReady || !hydrated || !supabase || activeProfileId === "joao") return;
    const client = supabase;
    const state = { done, target, hours, safety, banks, questionLogs, studiedTopics, focusArea, focusPercentage, mockExamCadence, weeklyTopics, mockExams, weeklyLessonGoal, weeklyQuestionGoal, mentorshipCheckins, recalculated };
    localStorage.setItem(`gps-main-state-${ownerId}-${activeProfileId}`, JSON.stringify(state));
    queueMicrotask(() => setSaveStatus("saving"));
    mainSaveQueue.current = mainSaveQueue.current.then(async () => {
      const { error } = await client.from("profile_states").upsert({ profile_id: activeProfileId, scope: "main", data: state, updated_at: new Date().toISOString() });
      if (error) { setSaveStatus("error"); setToast(`Falha ao sincronizar: ${error.message}`); }
      else setSaveStatus("saved");
    });
  }, [done, target, hours, safety, banks, questionLogs, studiedTopics, focusArea, focusPercentage, mockExamCadence, weeklyTopics, mockExams, weeklyLessonGoal, weeklyQuestionGoal, mentorshipCheckins, recalculated, hydrated, appReady, activeProfileId, ownerId]);

  useEffect(() => {
    const timer = setTimeout(() => setTodayIndex((new Date().getDay() + 6) % 7), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (appReady) localStorage.setItem(`gps-active-profile-${ownerId}`, activeProfileId);
  }, [activeProfileId, appReady, ownerId]);

  useEffect(() => {
    if (!appReady) return;
    let cancelled = false;
    const loadAgendaPreview = async () => {
      const result = await supabase?.from("profile_states").select("data").eq("profile_id", activeProfileId).eq("scope", "agenda").maybeSingle();
      if (cancelled) return;
      const localKey = `gps-agenda-state-${activeProfileId}`;
      let localData: { events?: AgendaEvent[]; rotation?: RotationState; suggestionKey?: string } | null = null;
      try { localData = JSON.parse(localStorage.getItem(localKey) ?? "null"); } catch { localData = null; }
      const parsed = (result?.data?.data as typeof localData) ?? localData;
      setAgendaPreview(parsed?.events ?? []);
      setAgendaRotation(parsed?.rotation ?? { area: "Nenhum rodízio cadastrado", start: "", end: "", boost: 40 });
      setAgendaSuggestionKey(parsed?.suggestionKey ?? "");
    };
    loadAgendaPreview();
    return () => { cancelled = true; };
  }, [activeProfileId, appReady]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const completedMinutes = useMemo(() => initialTasks.filter(t => done.includes(t.id)).reduce((sum, t) => sum + t.duration, 0), [done]);
  const totalMinutes = initialTasks.reduce((sum, t) => sum + t.duration, 0);
  const progress = Math.round((completedMinutes / totalMinutes) * 100);
  const probability = questionLogs.length ? Math.min(91, 45 + done.length * 3 + (recalculated ? 2 : 0)) : 0;
  const dailyCards = studiedTopics.length ? Math.min(45, 10 + questionLogs.reduce((sum, log) => sum + (log.accuracy < 50 ? 4 : log.accuracy < 70 ? 2 : 1), 0)) : 0;
  const totalBankWeight = Object.values(banks).reduce((sum, value) => sum + value, 0);
  const todayAgenda = agendaPreview.filter(event => event.day === todayIndex);
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
    if (focusArea) {
      topicBank.filter(topic => topic.area === focusArea).forEach(topic => {
        const current = scores.get(topic.title) ?? { score: 0, sourceBank: `Base de ${focusArea}` };
        scores.set(topic.title, { score: current.score * 2.2 + Math.max(6, totalBankWeight * 0.06), sourceBank: current.sourceBank });
      });
    }
    weeklyTopics.forEach(topic => {
      const current = scores.get(topic) ?? { score: 0, sourceBank: "Incluído por você" };
      scores.set(topic, { score: current.score + 120, sourceBank: "Incluído por você" });
    });
    questionLogs.forEach(log => {
      const current = scores.get(log.topic) ?? { score: focusArea && topicBank.find(topic => topic.title === log.topic)?.area === focusArea ? 8 : 0, sourceBank: "Seu desempenho" };
      if (current.score) scores.set(log.topic, { ...current, score: current.score * (log.accuracy < 60 ? 1.35 : log.accuracy < 75 ? 1.12 : 0.82) });
    });
    return [...scores.entries()].map(([topic, value]) => {
      const match = topicBank.find(item => item.title === topic);
      return { topic, area: match?.area ?? "Clínica Médica", score: value.score, sourceBank: value.sourceBank };
    }).sort((a, b) => b.score - a.score).slice(0, 40).map((item, index) => ({ ...item, rank: index + 1, questions: Math.max(15, Math.min(70, 42 - Math.min(index, 12) * 2 + (weeklyTopics.includes(item.topic) ? 15 : 0))) }));
  }, [banks, focusArea, weeklyTopics, questionLogs, totalBankWeight]);

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

  function markTopicAsStudied(topicTitle: string) {
    const matched = topicBank.find(topic => topic.title.toLocaleLowerCase("pt-BR") === topicTitle.toLocaleLowerCase("pt-BR"));
    if (!matched) return setToast("Bloco concluído. O assunto não foi encontrado no banco para marcar como estudado.");
    setStudiedTopics(previous => previous.includes(matched.id) ? previous : [...previous, matched.id]);
    setToast(`${matched.title} marcado como estudado. Os flashcards foram liberados.`);
  }

  function updateHomeAgenda(id: number, markStudied: boolean) {
    setAgendaPreview(previous => {
      const next = previous.map(event => event.id === id ? { ...event, completed: true, studied: markStudied || event.studied } : event);
      const selected = next.find(event => event.id === id);
      if (markStudied && selected) markTopicAsStudied(selected.topic);
      if (supabase && activeProfileId !== "joao") {
        const client = supabase;
        const state = { events: next, rotation: agendaRotation, suggestionKey: agendaSuggestionKey };
        localStorage.setItem(`gps-agenda-state-${activeProfileId}`, JSON.stringify(state));
        setSaveStatus("saving");
        agendaHomeSaveQueue.current = agendaHomeSaveQueue.current.then(async () => {
          const { error } = await client.from("profile_states").upsert({ profile_id: activeProfileId, scope: "agenda", data: state, updated_at: new Date().toISOString() });
          if (error) { setSaveStatus("error"); setToast(`Falha ao salvar a agenda: ${error.message}`); } else setSaveStatus("saved");
        });
      }
      return next;
    });
  }

  function addWeeklyTopic(value = plannerTopicDraft) {
    const topic = value.trim();
    if (!topic) return setToast("Escolha um assunto para incluir na semana.");
    if (weeklyTopics.includes(topic)) return setToast("Esse assunto já está na semana.");
    setWeeklyTopics(previous => [...previous, topic]);
    setPlannerTopicDraft("");
    setToast(`${topic} foi incluído como complemento da semana.`);
  }

  function savePlanner() {
    const total = Object.values(banks).reduce((sum, value) => sum + value, 0);
    if (total !== 100) {
      setToast(`A soma dos pesos deve ser 100% — agora está em ${total}%.`);
      return;
    }
    if (!focusArea) {
      setToast("Escolha a grande área que será o foco da semana.");
      return;
    }
    setPlannerOpen(false);
    setRecalculated(true);
    setDone(prev => prev.includes(1) ? prev : [...prev, 1]);
    setDone(prev => prev.includes(2) ? prev : [...prev, 2]);
    setToast(`Rotina de ${focusArea} criada com a prioridade das bancas. Salvando na nuvem...`);
  }

  const sectionTitle: Record<string, string> = {
    "Mentoria": "Seu acompanhamento semanal",
    "Hospitais": "Mapa de residências por especialidade",
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
          <div className={`save-state ${saveStatus}`}>{saveStatus === "saving" ? <CloudUpload size={16} /> : <Cloud size={16} />}<span>{saveStatus === "loading" ? "Carregando" : saveStatus === "saving" ? "Salvando..." : saveStatus === "error" ? "Erro ao salvar" : "Salvo na nuvem"}</span></div>
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
                    <div><div className="live-pill"><Sparkles size={13} /> COMEÇAR DO ZERO</div><h2>Configure sua primeira rota</h2><p>{recalculated ? (focusArea ? `Semana focada em ${focusArea}, ordenada pelas suas bancas.` : "Bancas salvas. Falta escolher a grande área da semana.") : "Sem prova diagnóstica: partimos do pressuposto de conhecimento zero."}</p></div>
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
                          <button className="start-button" onClick={() => { if (!isDone && (task.id === 1 || task.id === 2)) { setPlannerOpen(true); return; } toggleTask(task.id); setToast(isDone ? "Tarefa reaberta." : `Ótimo! ${task.topic} registrado no seu progresso.`); }}>{isDone ? <Check size={17} /> : <Play size={16} fill="currentColor" />}{isDone ? "Concluído" : "Começar"}</button>
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

              <section className="panel home-agenda-panel">
                <div className="panel-title"><div><span className="section-kicker">O QUE FAZER HOJE</span><h2>Sua agenda do dia</h2><p>{todayAgenda.length ? `${todayAgenda.length} blocos definidos pelo foco em ${focusArea || "sua área"} e pelas prioridades das bancas.` : "Configure a grande área da semana para receber as tarefas do dia."}</p></div><button onClick={() => setActive("Meu plano")}>Abrir agenda <ChevronRight size={16} /></button></div>
                {todayAgenda.length ? <div className="home-agenda-list">{todayAgenda.map(event => <article className={event.completed ? "completed" : ""} key={event.id}><button className="home-task-check" onClick={() => updateHomeAgenda(event.id, false)} aria-label="Concluir bloco">{event.completed ? <Check size={17} /> : <Play size={14} />}</button><div><span>{event.type === "cards" ? "FLASHCARDS" : event.type === "review" ? "REVISÃO ATIVA" : event.type === "questions" ? "QUESTÕES" : event.type === "mock" ? "PROVA COMPLETA" : event.type === "correction" ? "CORREÇÃO" : "TEORIA"}</span><strong>{event.topic}</strong><small>{event.meta}</small></div>{topicBank.some(topic => topic.title === event.topic) && <button className={`mark-studied-button ${event.studied ? "done" : ""}`} onClick={() => updateHomeAgenda(event.id, true)}>{event.studied ? <Check size={15} /> : <BookOpenCheck size={15} />}{event.studied ? "Estudado" : "Marcar estudado"}</button>}</article>)}</div> : <EmptyMini icon={<CalendarClock size={22} />} title="Nenhuma tarefa para hoje" text="Abra Meu plano e escolha a grande área da semana." />}
              </section>

              <section className="lower-grid">
                <div className="panel priority-panel">
                  <div className="panel-title"><div><h2>{prioritySuggestions.length ? "Prioridades calculadas para você" : "Prioridades aguardando suas escolhas"}</h2><p>{prioritySuggestions.length ? `Incidência das bancas + foco em ${focusArea || "grande área"} + desempenho registrado.` : "Escolha as bancas e a grande área da semana; nenhuma avaliação inicial é necessária."}</p></div><button onClick={() => setActive("Prioridades")}>Ver bancas <ChevronRight size={16} /></button></div>
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
                <button onClick={() => setActive("Simulados")}><span className="action-icon peach"><ClipboardCheck size={20} /></span><div><strong>Cadastrar prova</strong><small>Registre resultado e erros do simulado</small></div><ChevronRight size={17} /></button>
                <button onClick={() => setActive("Assuntos")}><span className="action-icon lilac"><LibraryBig size={20} /></span><div><strong>Explorar assuntos</strong><small>{topicBank.length} temas disponíveis</small></div><ChevronRight size={17} /></button>
              </section>
            </>
          ) : (
            <section className="secondary-page">
              <div className="secondary-head"><div><p className="eyebrow">GPS DA APROVAÇÃO</p><h1>{sectionTitle[active]}</h1><p>Todos os dados abaixo conversam com sua rota diária e são recalculados conforme seu progresso.</p></div>{!(["Mentoria", "Hospitais", "Meu plano", "Flashcards", "Questões", "Assuntos", "Prioridades"].includes(active)) && <button className="primary-button" onClick={() => active === "Bancas e metas" ? setPlannerOpen(true) : setToast("Novo registro adicionado à sua fila.")}><Plus size={17} /> {active === "Bancas e metas" ? "Ajustar metas" : "Novo registro"}</button>}</div>
              {active === "Mentoria" && <MentorshipPage agenda={agendaPreview} logs={questionLogs} focusArea={focusArea} target={target} probability={probability} lessonGoal={weeklyLessonGoal} questionGoal={weeklyQuestionGoal} setLessonGoal={setWeeklyLessonGoal} setQuestionGoal={setWeeklyQuestionGoal} checkins={mentorshipCheckins} setCheckins={setMentorshipCheckins} setToast={setToast} onOpenPlan={() => setActive("Meu plano")} />}
              {active === "Hospitais" && <ResidencyProgramsPage />}
              {active === "Meu plano" && <PlanPage setToast={setToast} profileId={activeProfileId} focusArea={focusArea} focusPercentage={focusPercentage} weeklyTopics={weeklyTopics} priorities={prioritySuggestions} questionLogs={questionLogs} dailyCards={dailyCards} mockExamCadence={mockExamCadence} onFocusAreaChange={area => { setFocusArea(area); setDone(prev => prev.includes(2) ? prev : [...prev, 2]); }} onSaveStatus={setSaveStatus} onAgendaChange={handleAgendaChange} onMarkStudied={markTopicAsStudied} />}
              {active === "Flashcards" && <FlashcardsPage logs={questionLogs} exams={mockExams} banks={banks} dailyCards={dailyCards} setToast={setToast} profileId={activeProfileId} studiedTopics={studiedTopics} onOpenTopics={() => setActive("Assuntos")} onSaveStatus={setSaveStatus} />}
              {active === "Questões" && <QuestionsPage logs={questionLogs} setLogs={setQuestionLogs} setToast={setToast} setStudiedTopics={setStudiedTopics} />}
              {active === "Assuntos" && <TopicsPage studiedTopics={studiedTopics} setStudiedTopics={setStudiedTopics} setToast={setToast} focusArea={focusArea} weeklyTopics={weeklyTopics} setWeeklyTopics={setWeeklyTopics} />}
              {active === "Prioridades" && <PrioritiesPage banks={banks} priorities={prioritySuggestions} onConfigure={() => setPlannerOpen(true)} />}
              {active === "Desempenho" && <PerformancePage probability={probability} hasData={questionLogs.length > 0} logs={questionLogs} />}
              {active === "Simulados" && <SimuladosPage exams={mockExams} setExams={setMockExams} setToast={setToast} />}
              {active === "Revisões" && <ReviewsPage />}
              {active === "Bancas e metas" && <GoalsPage banks={banks} target={target} focusArea={focusArea} onEdit={() => setPlannerOpen(true)} />}
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
            <label className="plain-field focus-field">Grande área de foco da semana<select value={focusArea} onChange={event => setFocusArea(event.target.value as FocusArea)}><option value="">Escolha a grande área</option>{STUDY_AREAS.map(area => <option value={area} key={area}>{area}</option>)}</select><small>O cronograma escolherá os assuntos dessa área conforme o peso e a incidência das bancas.</small></label>
            <label className="range-label focus-percentage"><span><b>Quanto da semana dedicar à área escolhida?</b><strong>{focusPercentage}%</strong></span><input type="range" min="50" max="90" step="5" value={focusPercentage} onChange={event => setFocusPercentage(Number(event.target.value))} /><small>Os outros {100 - focusPercentage}% serão preenchidos com temas de maior retorno de outras áreas e das suas bancas.</small></label>
            <div className="weekly-topic-picker"><label className="plain-field">Assunto específico opcional<div><input list="planner-topics" value={plannerTopicDraft} onChange={event => setPlannerTopicDraft(event.target.value)} placeholder="Ex.: Síndromes Hipertensivas da Gestação" onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addWeeklyTopic(); } }} /><button type="button" onClick={() => addWeeklyTopic()}><Plus size={16} /> Incluir</button></div><datalist id="planner-topics">{topicBank.map(topic => <option value={topic.title} key={topic.id} />)}</datalist><small>Use apenas quando quiser garantir que um assunto específico apareça nesta semana.</small></label>{weeklyTopics.length > 0 && <div className="weekly-topic-chips">{weeklyTopics.map(topic => <span key={topic}>{topic}<button type="button" aria-label={`Remover ${topic}`} onClick={() => setWeeklyTopics(previous => previous.filter(item => item !== topic))}><X size={13} /></button></span>)}</div>}</div>
            <div className="two-fields"><label>Meta de nota<div><input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} /><em>%</em></div></label><label>Margem de segurança<div><input type="number" value={safety} onChange={e => setSafety(Number(e.target.value))} /><em>pts</em></div></label></div>
            <label className="range-label"><span><b>Horas disponíveis por dia</b><strong>{hours}h</strong></span><input type="range" min="0" max="8" step="0.5" value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
            <label className="plain-field focus-field">Prova completa<select value={mockExamCadence} onChange={event => setMockExamCadence(Number(event.target.value) as 3 | 4)}><option value={3}>A cada 3 semanas</option><option value={4}>A cada 4 semanas</option></select><small>O calendário reservará um bloco para realizar a prova e outro, no dia seguinte, para corrigir e registrar os erros.</small></label>
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

function MentorshipPage({ agenda, logs, focusArea, target, probability, lessonGoal, questionGoal, setLessonGoal, setQuestionGoal, checkins, setCheckins, setToast, onOpenPlan }: {
  agenda: AgendaEvent[]; logs: QuestionLog[]; focusArea: FocusArea; target: number; probability: number;
  lessonGoal: number; questionGoal: number; setLessonGoal: (value: number) => void; setQuestionGoal: (value: number) => void;
  checkins: MentorshipCheckin[]; setCheckins: React.Dispatch<React.SetStateAction<MentorshipCheckin[]>>;
  setToast: (message: string) => void; onOpenPlan: () => void;
}) {
  const currentWeekEvents = agenda.filter(event => event.day >= 0 && event.day < 7);
  const scheduledLessons = currentWeekEvents.filter(event => event.type === "theory").length;
  const completedLessons = currentWeekEvents.filter(event => event.type === "theory" && event.completed).length;
  const volumeFromMeta = (meta: string) => Number(meta.match(/(\d+)\s*quest/i)?.[1] ?? 0);
  const scheduledQuestions = currentWeekEvents.filter(event => event.type === "questions" || event.type === "review").reduce((sum, event) => sum + volumeFromMeta(event.meta), 0);
  const completedAgendaQuestions = currentWeekEvents.filter(event => (event.type === "questions" || event.type === "review") && event.completed).reduce((sum, event) => sum + volumeFromMeta(event.meta), 0);
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
  const weekLogs = logs.filter(log => {
    if (log.date === "Hoje") return true;
    const date = new Date(`${log.date}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date >= monday && date <= sunday;
  });
  const loggedQuestions = weekLogs.reduce((sum, log) => sum + log.questions, 0);
  const questionsDone = Math.max(loggedQuestions, completedAgendaQuestions);
  const weightedAccuracy = loggedQuestions ? Math.round(weekLogs.reduce((sum, log) => sum + log.questions * log.accuracy, 0) / loggedQuestions) : null;
  const lessonProgress = Math.min(100, Math.round(completedLessons / Math.max(1, lessonGoal) * 100));
  const questionProgress = Math.min(100, Math.round(questionsDone / Math.max(1, questionGoal) * 100));
  const adherence = Math.round(lessonProgress * .4 + questionProgress * .6);
  const suggestedLessonGoal = Math.max(4, scheduledLessons);
  const suggestedQuestionGoal = Math.max(60, scheduledQuestions);
  const weakest = weekLogs.slice().sort((a, b) => a.accuracy - b.accuracy)[0];

  const feedback = !focusArea
    ? "Defina a grande área da semana para o mentor digital conseguir comparar sua execução com uma rota real."
    : adherence >= 90
      ? `Semana muito consistente em ${focusArea}. Mantenha o volume e use o próximo bloco adaptativo no assunto de menor acerto${weakest ? `: ${weakest.topic}` : ""}.`
      : lessonProgress >= 75 && questionProgress < 60
        ? "A teoria avançou, mas faltou transformar conteúdo em recuperação ativa. Proteja primeiro os blocos de questões e flashcards já agendados."
        : lessonProgress < 60
          ? "A carga de teoria ficou abaixo da meta. Redistribua uma aula para o próximo espaço livre, sem apagar as revisões vencidas."
          : "Você está em movimento, mas ainda abaixo da rota semanal. Complete o menor bloco pendente hoje para recuperar aderência sem sobrecarga.";

  function saveCheckin() {
    const entry: MentorshipCheckin = {
      id: Date.now(), date: new Date().toISOString().slice(0, 10), lessonsDone: completedLessons, lessonGoal,
      questionsDone, questionGoal, adherence, accuracy: weightedAccuracy, feedback,
    };
    setCheckins(previous => [entry, ...previous].slice(0, 16));
    setToast("Check-in semanal salvo. O feedback também ficou guardado neste perfil.");
  }

  return <div className="page-stack mentorship-page">
    <section className="mentorship-hero">
      <div><span className="section-kicker">MENTOR DIGITAL · SEMANA ATUAL</span><h2>{focusArea ? `Rota de ${focusArea}` : "Sua rota ainda precisa de um foco"}</h2><p>Metas flexíveis, execução real e um feedback objetivo para decidir o próximo passo.</p><div className="mentorship-hero-actions"><button className="primary-button" onClick={onOpenPlan}><CalendarClock size={17} /> Abrir cronograma</button><button className="outline-button" onClick={saveCheckin}><ClipboardCheck size={17} /> Salvar check-in</button></div></div>
      <div className="mentor-score"><small>ADERÊNCIA SEMANAL</small><strong>{adherence}%</strong><span>{adherence >= 80 ? "No caminho" : adherence >= 50 ? "Ajuste necessário" : "Semana em construção"}</span></div>
    </section>

    <section className="mentorship-goals">
      <article className="panel mentorship-goal-card"><header><span><BookOpenCheck size={19} /></span><div><small>META DE AULAS</small><strong>{completedLessons} de {lessonGoal}</strong></div></header><div className="mentor-progress"><i style={{ width: `${lessonProgress}%` }} /></div><label>Meta semanal<input type="number" min="1" max="20" value={lessonGoal} onChange={event => setLessonGoal(Math.max(1, Number(event.target.value)))} /></label><p>{scheduledLessons ? `${scheduledLessons} aulas estão no cronograma desta semana.` : "Nenhuma aula foi gerada ainda."}</p></article>
      <article className="panel mentorship-goal-card"><header><span><ListChecks size={19} /></span><div><small>META DE QUESTÕES</small><strong>{questionsDone} de {questionGoal}</strong></div></header><div className="mentor-progress"><i style={{ width: `${questionProgress}%` }} /></div><label>Meta semanal<input type="number" min="15" step="15" max="1000" value={questionGoal} onChange={event => setQuestionGoal(Math.max(15, Number(event.target.value)))} /></label><p>{scheduledQuestions ? `${scheduledQuestions} questões previstas entre D3 e revisões.` : "A meta começa em 60 e se adapta ao calendário."}</p></article>
      <article className="panel mentorship-goal-card mentor-performance"><header><span><TrendingUp size={19} /></span><div><small>QUALIDADE DA PRÁTICA</small><strong>{weightedAccuracy === null ? "—" : `${weightedAccuracy}%`}</strong></div></header><div className="mentor-stat-row"><span>GPS Score <b>{probability}%</b></span><span>Meta de nota <b>{target ? `${target}%` : "—"}</b></span></div><p>{weakest ? `Atenção atual: ${weakest.topic} (${weakest.accuracy}%).` : "Registre questões para liberar a análise de desempenho."}</p></article>
    </section>

    <section className="panel mentor-feedback"><div className="mentor-avatar"><GraduationCap size={24} /></div><div><span className="section-kicker">FEEDBACK DA SEMANA</span><h2>{adherence >= 80 ? "Boa execução. Agora refine." : "Próximo ajuste prioritário"}</h2><p>{feedback}</p><div className="mentor-actions"><span><Check size={14} /> Preserve flashcards todos os dias</span><span><Check size={14} /> Não pule revisão vencida</span>{weakest && <span><Target size={14} /> Refaça um bloco curto de {weakest.topic}</span>}</div></div></section>

    <section className="panel mentor-recommendation"><div><span className="section-kicker">META SUGERIDA PELO CRONOGRAMA</span><h2>{suggestedLessonGoal} aulas · {suggestedQuestionGoal} questões</h2><p>A sugestão lê os blocos da semana; você continua livre para alterar as duas metas.</p></div><button className="outline-button" onClick={() => { setLessonGoal(suggestedLessonGoal); setQuestionGoal(suggestedQuestionGoal); setToast("Metas alinhadas ao cronograma atual."); }}><RefreshCw size={16} /> Usar sugestão</button></section>

    <section className="panel mentor-history"><div className="panel-title"><div><h2>Histórico de check-ins</h2><p>Um registro semanal para enxergar tendência, não apenas um dia isolado.</p></div></div>{checkins.length ? <div>{checkins.map(item => <article key={item.id}><time>{item.date.split("-").reverse().join("/")}</time><strong>{item.adherence}% de aderência</strong><span>{item.lessonsDone}/{item.lessonGoal} aulas · {item.questionsDone}/{item.questionGoal} questões · acerto {item.accuracy === null ? "—" : `${item.accuracy}%`}</span><p>{item.feedback}</p></article>)}</div> : <EmptyMini icon={<ClipboardCheck size={22} />} title="Nenhum check-in salvo" text="Ao fim da semana, salve o retrato das metas e do feedback." />}</section>

    <p className="mentor-method-note">Modelo inspirado em acompanhamento por metas flexíveis e métricas de execução. Referências de produto: <a href="https://www.medway.com.br/conteudos/por-que-fazer-mentoria-para-residencia-medica/" target="_blank" rel="noreferrer">Medway</a> e <a href="https://medgrupo.com.br/mentoria/" target="_blank" rel="noreferrer">MEDGRUPO</a>. O feedback é automático e não substitui orientação pedagógica humana.</p>
  </div>;
}

function ResidencyProgramsPage() {
  const [specialty, setSpecialty] = useState<ResidencySpecialty>("Neurologia");
  const scaleMaximum = (scale: ResidencyProgram["scale"]) => scale === "0–10" ? 10 : scale === "0–100" ? 100 : 1000;
  const safeTarget = (program: ResidencyProgram) => {
    const extra = program.scale === "0–10" ? .3 : program.scale === "0–100" ? 3 : 30;
    return Math.min(scaleMaximum(program.scale), program.cutoffs[specialty] + extra);
  };
  const formatScore = (value: number, scale: ResidencyProgram["scale"]) => scale === "0–10" ? value.toFixed(1).replace(".", ",") : String(Math.round(value));
  const pressure = (program: ResidencyProgram) => {
    const normalized = program.cutoffs[specialty] / scaleMaximum(program.scale);
    return normalized >= .85 ? "Muito alta" : normalized >= .75 ? "Alta" : "Moderada";
  };

  return <div className="page-stack residency-page">
    <section className="residency-intro panel"><div><span className="section-kicker">MAPA DE PROGRAMAS · REFERÊNCIA 2026</span><h2>Compare a mesma especialidade sem misturar escalas</h2><p>Escolha a área e veja o perfil do serviço, o processo seletivo e a nota do último classificado usada como referência.</p></div><label>Especialidade<select value={specialty} onChange={event => setSpecialty(event.target.value as ResidencySpecialty)}>{RESIDENCY_SPECIALTIES.map(item => <option key={item}>{item}</option>)}</select></label></section>

    <section className="residency-summary three-cards"><MetricCard icon={<Stethoscope />} label="Especialidade" value={specialty === "Otorrinolaringologia" ? "Otorrino" : specialty === "Radiologia" ? "Radio" : specialty} note={`${residencyPrograms.length} referências comparadas`} /><MetricCard icon={<MapPinned />} label="Abrangência" value="2 estados" note="SP, CE e processos nacionais" /><MetricCard icon={<Target />} label="Ano-base" value="2026" note="cortes históricos, não garantia" /></section>

    <section className="residency-grid">{residencyPrograms.map(program => {
      const cutoff = program.cutoffs[specialty];
      return <article className="panel residency-card" key={program.id}><header><div><span>{program.process}</span><h2>{program.institution}</h2><small>{program.hospital}</small></div><b>{pressure(program)}</b></header><div className="residency-location"><MapPinned size={14} /> {program.location}</div><p>{program.profile}</p><div className="cutoff-box"><div><small>CORTE OBSERVADO · {program.year}</small><strong>{formatScore(cutoff, program.scale)}</strong><span>escala {program.scale}</span></div><div><small>META DE SEGURANÇA</small><strong>{formatScore(safeTarget(program), program.scale)}</strong><span>margem sugerida, não garantia</span></div></div><a href={program.sourceUrl} target="_blank" rel="noreferrer">Conferir fonte e tabela completa <ChevronRight size={15} /></a></article>;
    })}</section>

    <section className="panel residency-guide"><ShieldCheck size={23} /><div><h2>Como interpretar esta avaliação</h2><p>A nota compara pressão seletiva, não a qualidade absoluta do programa. Para escolher hospital, confirme no edital atual: cenários de prática, volume de procedimentos, preceptoria, carga de plantão, rodízios externos, bolsas e vagas. No SUS-SP, o hospital depende da escolha e da sua classificação; no ENARE, cada instituição possui corte próprio.</p></div></section>
  </div>;
}

function PlanPage({ setToast, profileId, focusArea, focusPercentage, weeklyTopics, priorities, questionLogs, dailyCards, mockExamCadence, onFocusAreaChange, onSaveStatus, onAgendaChange, onMarkStudied }: { setToast: (message: string) => void; profileId: string; focusArea: FocusArea; focusPercentage: number; weeklyTopics: string[]; priorities: PrioritySuggestion[]; questionLogs: QuestionLog[]; dailyCards: number; mockExamCadence: 3 | 4; onFocusAreaChange: (area: FocusArea) => void; onSaveStatus: (status: SaveStatus) => void; onAgendaChange: (events: AgendaEvent[], rotation: RotationState, suggestionKey: string) => void; onMarkStudied: (topic: string) => void }) {
  const calendarWeeks = 13;
  const calendarLength = calendarWeeks * 7;
  const calendarDays = useMemo(() => {
    const now = new Date();
    const monday = new Date(now); monday.setHours(12, 0, 0, 0); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: calendarLength }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return { absolute: index, label: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][date.getDay()], number: String(date.getDate()).padStart(2, "0"), month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), iso: date.toISOString().slice(0, 10) }; });
  }, [calendarLength]);
  const [weekOffset, setWeekOffset] = useState(0);
  const visibleDays = calendarDays.slice(weekOffset * 7, weekOffset * 7 + 7);
  const [events, setEvents] = useState<AgendaEvent[]>(initialAgenda);
  const [dragged, setDragged] = useState<number | null>(null);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [rotation, setRotation] = useState({ area: "Nenhum rodízio cadastrado", start: "", end: "", boost: 40 });
  const [newBlock, setNewBlock] = useState({ topic: "", day: 0, meta: "2h", type: "theory" as AgendaEvent["type"] });
  const [weekTopicChoices, setWeekTopicChoices] = useState<Record<string, string[]>>({});
  const [weekTopicDraft, setWeekTopicDraft] = useState("");
  const [agendaHydrated, setAgendaHydrated] = useState(false);
  const agendaSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const loadedSuggestionKey = useRef("");
  const suggestedAgenda = useMemo<AgendaEvent[]>(() => {
    if (!focusArea) return [];
    const lessonsPerWeek = 4;
    const totalLessons = lessonsPerWeek * 4;
    const focusTarget = Math.max(1, Math.round(totalLessons * focusPercentage / 100));
    const focusPool = [...priorities.filter(item => item.area === focusArea).map(item => item.topic), ...topicBank.filter(topic => topic.area === focusArea).map(topic => topic.title)].filter((topic, index, list) => list.indexOf(topic) === index);
    const mixedPool = [...priorities.filter(item => item.area !== focusArea).map(item => item.topic), ...topicBank.filter(topic => topic.area !== focusArea).map(topic => topic.title)].filter((topic, index, list) => list.indexOf(topic) === index);
    let focusCursor = 0; let mixedCursor = 0;
    const lessons = Array.from({ length: totalLessons }, (_, index) => {
      const useFocus = (index * focusTarget) % totalLessons < focusTarget;
      return useFocus ? focusPool[focusCursor++ % Math.max(1, focusPool.length)] ?? focusArea : mixedPool[mixedCursor++ % Math.max(1, mixedPool.length)] ?? focusPool[focusCursor++ % Math.max(1, focusPool.length)] ?? focusArea;
    });
    const generated: AgendaEvent[] = [];
    let eventId = 81000;
    for (let week = 0; week < 4; week += 1) {
      const base = week * 7;
      const automaticLessons = lessons.slice(week * lessonsPerWeek, week * lessonsPerWeek + lessonsPerWeek);
      const chosenForWeek = (weekTopicChoices[String(week)] ?? (week === 0 ? weeklyTopics : [])).slice(0, 4);
      const weekLessons = automaticLessons.map((topic, index) => chosenForWeek[index] ?? topic);
      weekLessons.forEach((topic, lessonIndex) => {
        const priority = priorities.find(item => item.topic === topic);
        const theoryDay = base + (lessonIndex < 2 ? 0 : 1);
        const questionDay = base + 2;
        generated.push({ id: eventId++, day: theoryDay, topic, meta: `Aula completa · cerca de 2h · ${priority?.sourceBank ?? "sequência pedagógica"}`, type: "theory" });
        generated.push({ id: eventId++, day: questionDay, topic, meta: "Primeiro bloco · 15 questões da aula · corrigir e registrar o percentual", type: "questions" });
        const logs = questionLogs.filter(log => log.topic.toLocaleLowerCase("pt-BR") === topic.toLocaleLowerCase("pt-BR"));
        const latest = logs[0]; const previous = logs[1]; const accuracy = latest?.accuracy ?? 0;
        const change = latest && previous ? latest.accuracy - previous.accuracy : 0;
        const todayIndex = Math.max(0, calendarDays.findIndex(day => day.iso === new Date().toISOString().slice(0, 10)));
        const recordedIndex = latest?.date && /^\d{4}-\d{2}-\d{2}$/.test(latest.date) ? calendarDays.findIndex(day => day.iso === latest.date) : todayIndex;
        const performanceDay = latest ? (recordedIndex >= 0 ? recordedIndex : todayIndex) : questionDay;
        const reviewStart = latest ? performanceDay : questionDay;
        const trend = change <= -10 ? ` · queda de ${Math.abs(change)} pontos` : change >= 10 ? ` · melhora de ${change} pontos` : "";
        const intervals = accuracy < 50 ? [3, 4, 7, 14, 30] : accuracy < 70 ? [4, 7, 14, 30] : [5, 10, 21, 30];
        const questionVolumes = accuracy < 50 ? [10, 8, 6, 5, 4] : accuracy < 70 ? [7, 6, 5, 4] : [5, 4, 4, 3];
        let reviewDay = reviewStart;
        intervals.forEach((interval, reviewIndex) => {
          reviewDay += interval;
          if (reviewDay < 0 || reviewDay >= calendarLength) return;
          const stage = reviewIndex + 1;
          generated.push({ id: eventId++, day: reviewDay, topic, meta: `Revisão ${stage} · ${questionVolumes[reviewIndex]} questões curtas + flashcards · intervalo ${interval}d · último acerto ${latest ? `${accuracy}%${trend}` : "a medir"}`, type: "review" });
        });
      });
      generated.push({ id: eventId++, day: base + 1, topic: "Confecção e revisão de materiais", meta: "Organizar resumos, imagens, algoritmos e dúvidas das 4 aulas · bloco livre e editável", type: "materials" });
    }
    const cardGoal = Math.max(10, dailyCards);
    for (let day = 0; day < calendarLength; day += 1) generated.push({ id: 85000 + day, day, topic: "Fila diária adaptativa", meta: `${cardGoal} flashcards · erros + assuntos escolhidos`, type: "cards" });
    let mockIndex = 0;
    for (let mockDay = mockExamCadence * 7 - 2; mockDay < calendarLength; mockDay += mockExamCadence * 7) {
      generated.push({ id: 88000 + mockIndex * 2, day: mockDay, topic: "Prova completa", meta: "Simulado integral · 4h · condições reais de prova", type: "mock" });
      if (mockDay + 1 < calendarLength) generated.push({ id: 88001 + mockIndex * 2, day: mockDay + 1, topic: "Correção da prova completa", meta: "2h · classificar erros, registrar o novo acerto e recalcular revisões", type: "correction" });
      mockIndex += 1;
    }
    return generated;
  }, [focusArea, focusPercentage, weeklyTopics, weekTopicChoices, priorities, questionLogs, dailyCards, mockExamCadence, calendarDays, calendarLength]);
  const suggestionKey = useMemo(() => JSON.stringify({ calendarStart: calendarDays[0]?.iso, focusArea, focusPercentage, weeklyTopics, weekTopicChoices, mockExamCadence, suggested: suggestedAgenda.map(event => [event.day, event.topic, event.meta]) }), [calendarDays, focusArea, focusPercentage, weeklyTopics, weekTopicChoices, mockExamCadence, suggestedAgenda]);
  const suggestionSnapshot = useRef({ agenda: suggestedAgenda, key: suggestionKey });
  useEffect(() => { suggestionSnapshot.current = { agenda: suggestedAgenda, key: suggestionKey }; }, [suggestedAgenda, suggestionKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAgendaHydrated(false);
      const loadAgenda = async () => {
        const suggestion = suggestionSnapshot.current;
        const result = await supabase?.from("profile_states").select("data").eq("profile_id", profileId).eq("scope", "agenda").maybeSingle();
        const localKey = `gps-agenda-state-${profileId}`;
        let localData: { events?: AgendaEvent[]; rotation?: typeof rotation; suggestionKey?: string; weekTopicChoices?: Record<string, string[]> } | null = null;
        try { localData = JSON.parse(localStorage.getItem(localKey) ?? "null"); } catch { localData = null; }
        const parsed = result?.data?.data ?? localData;
        if (parsed) {
          setEvents(Array.isArray(parsed.events) ? parsed.events : suggestion.agenda);
          setRotation(currentRotation => parsed.rotation ?? currentRotation);
          setWeekTopicChoices(parsed.weekTopicChoices ?? {});
        } else { setEvents(suggestion.agenda); setRotation({ area: "Nenhum rodízio cadastrado", start: "", end: "", boost: 40 }); setWeekTopicChoices({}); }
        loadedSuggestionKey.current = parsed ? parsed.suggestionKey ?? "" : suggestion.key;
        setAgendaHydrated(true);
      };
      loadAgenda();
    }, 0);
    return () => clearTimeout(timer);
  }, [profileId]);

  useEffect(() => {
    if (!agendaHydrated || loadedSuggestionKey.current === suggestionKey) return;
    setEvents(previous => [...previous.filter(event => event.id < 81000 || event.id >= 90000), ...suggestedAgenda]);
    loadedSuggestionKey.current = suggestionKey;
    setToast(focusArea ? `Cronograma recalculado para ${focusArea}, respeitando as prioridades das bancas.` : "Escolha uma grande área para gerar a semana.");
  }, [agendaHydrated, suggestionKey, suggestedAgenda, focusArea, setToast]);

  useEffect(() => {
    if (!agendaHydrated || !supabase || profileId === "joao") return;
    const client = supabase;
    const state = { events, rotation, suggestionKey, weekTopicChoices };
    localStorage.setItem(`gps-agenda-state-${profileId}`, JSON.stringify(state));
    onAgendaChange(events, rotation, suggestionKey);
    onSaveStatus("saving");
    agendaSaveQueue.current = agendaSaveQueue.current.then(async () => {
      const { error } = await client.from("profile_states").upsert({ profile_id: profileId, scope: "agenda", data: state, updated_at: new Date().toISOString() });
      if (error) { onSaveStatus("error"); setToast(`Falha ao salvar a agenda: ${error.message}`); }
      else onSaveStatus("saved");
    });
  }, [events, rotation, suggestionKey, weekTopicChoices, agendaHydrated, profileId, onSaveStatus, setToast, onAgendaChange]);

  const selectedTopicsThisWeek = (weekTopicChoices[String(weekOffset)] ?? (weekOffset === 0 ? weeklyTopics : [])).slice(0, 4);

  function addTopicToVisibleWeek() {
    if (weekOffset >= 4) return setToast("As semanas 5 a 13 são reservadas à consolidação. Escolha uma das quatro primeiras semanas para inserir uma nova aula.");
    const normalized = weekTopicDraft.trim().toLocaleLowerCase("pt-BR");
    const matched = topicBank.find(topic => topic.title.toLocaleLowerCase("pt-BR") === normalized);
    if (!matched) return setToast("Escolha um assunto da lista cadastrada.");
    if (selectedTopicsThisWeek.includes(matched.title)) return setToast("Esse assunto já está escolhido nesta semana.");
    if (selectedTopicsThisWeek.length >= 4) return setToast("Esta semana já tem quatro assuntos escolhidos. Remova um deles antes de trocar.");
    setWeekTopicChoices(previous => ({ ...previous, [String(weekOffset)]: [...selectedTopicsThisWeek, matched.title] }));
    setWeekTopicDraft("");
    setToast(`${matched.title} entrou somente na semana ${weekOffset + 1}. As outras aulas e semanas foram preservadas.`);
  }

  function removeTopicFromVisibleWeek(topic: string) {
    setWeekTopicChoices(previous => ({ ...previous, [String(weekOffset)]: selectedTopicsThisWeek.filter(item => item !== topic) }));
    setToast(`${topic} foi retirado da semana ${weekOffset + 1}.`);
  }

  function moveEvent(id: number, day: number) {
    setEvents(prev => prev.map(event => event.id === id ? { ...event, day } : event));
    setDragged(null);
    setToast(`Bloco movido para ${calendarDays[day]?.label ?? "o novo dia"}. A rota foi ajustada.`);
  }

  function saveBlock() {
    if (!newBlock.topic.trim()) return setToast("Digite o assunto do novo bloco.");
    setEvents(prev => [...prev, { id: Date.now(), ...newBlock }]);
    setAddOpen(false);
    setNewBlock({ topic: "", day: weekOffset * 7, meta: "2h", type: "theory" });
    setToast("Bloco incluído na agenda.");
  }

  function saveEditedEvent() {
    if (!editingEvent?.topic.trim()) return setToast("Informe o assunto do bloco.");
    setEvents(previous => previous.map(event => event.id === editingEvent.id ? editingEvent : event)); setEditingEvent(null); setToast("Bloco atualizado e salvo na sua agenda.");
  }

  function removeEvent(id: number) {
    setEvents(previous => previous.filter(event => event.id !== id)); setEditingEvent(null); setToast("Bloco removido. Você continua livre para reorganizar a semana.");
  }

  function eventLabel(type: AgendaEvent["type"]) {
    return type === "rotation" ? "RODÍZIO" : type === "cards" ? "FLASHCARDS" : type === "review" ? "REVISÃO ATIVA" : type === "questions" ? "QUESTÕES" : type === "materials" ? "MATERIAIS" : type === "mock" ? "PROVA COMPLETA" : type === "correction" ? "CORREÇÃO" : "TEORIA";
  }

  function markEventStudied(id: number, topic: string) {
    setEvents(previous => previous.map(event => event.id === id ? { ...event, completed: true, studied: true } : event));
    onMarkStudied(topic);
  }

  function applyRotation() {
    const mappedArea: FocusArea = rotation.area === "Saúde Coletiva" ? "Preventiva" : STUDY_AREAS.includes(rotation.area as StudyTopic["area"]) ? rotation.area as StudyTopic["area"] : "";
    if (mappedArea) onFocusAreaChange(mappedArea);
    setRotationOpen(false);
    setToast(rotation.area === "Nenhum rodízio cadastrado" ? "Rodízio configurado como vazio." : mappedArea ? `Rodízio de ${rotation.area} aplicado. ${mappedArea} virou o foco da semana.` : `Rodízio de ${rotation.area} salvo. Escolha a grande área equivalente no Super Planner.`);
  }

  return <div className="page-stack">
    {focusArea && <section className="focus-banner"><div><span className="section-kicker">EIXO DA SEMANA · NÃO EXCLUSIVO</span><h2>{focusArea} · {focusPercentage}% da rota</h2><p>Os outros {100 - focusPercentage}% intercalam temas de outras áreas conforme as bancas. A sequência segue teoria → questões → revisão ativa.</p>{weeklyTopics.length > 0 && <small>Assuntos fixados por você: {weeklyTopics.join(" · ")}</small>}</div><span><Sparkles size={16} /> plano misto e editável</span></section>}
    <section className="methodology-banner"><div><RefreshCw size={23} /><span><strong>4 aulas por semana + revisão que reage ao último resultado</strong><p>D1: 2 aulas · D2: 2 aulas e materiais · D3: primeiros blocos de 15 questões · depois, revisões + flashcards diários. &lt;50%: 3 → 4 → 7 → 14 → 30 dias · 50–69%: 4 → 7 → 14 → 30 dias · ≥70%: 5 → 10 → 21 → 30 dias.</p></span></div></section>
    <section className="rotation-banner">
      <div className="rotation-symbol"><Stethoscope size={23} /></div>
      <div className="rotation-copy"><span className="section-kicker">INTERNATO</span><h2>{rotation.area === "Nenhum rodízio cadastrado" ? rotation.area : `Rodízio de ${rotation.area}`}</h2><p>{rotation.area === "Nenhum rodízio cadastrado" ? "Informe sua área e o período para o GPS aproximar teoria e prática." : `Durante o período escolhido, ${rotation.boost}% da carga flexível será direcionada ao rodízio.`}</p></div>
      <div className="rotation-balance"><div><i style={{ width: `${rotation.boost}%` }} /></div><span><b>{rotation.boost}%</b> internato <b>{100 - rotation.boost}%</b> prova</span></div>
      <button className="outline-button" onClick={() => setRotationOpen(true)}><Settings size={16} /> Editar rodízio</button>
    </section>

    <section className="panel week-topic-editor">
      <div><span className="section-kicker">ESCOLHAS DA SEMANA {weekOffset + 1}</span><h2>{weekOffset < 4 ? "Escolha até 4 assuntos" : "Semana de consolidação"}</h2><p>{weekOffset < 4 ? "Cada escolha ocupa uma das 4 aulas. As vagas que você não preencher continuam automáticas pela grande área e pelas bancas, sem alterar outras semanas." : "Da semana 5 em diante, o calendário prioriza revisões espaçadas, flashcards e simulados."}</p></div>
      {weekOffset < 4 && <div className="week-topic-controls"><div><input list="week-topic-options" value={weekTopicDraft} onChange={event => setWeekTopicDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") addTopicToVisibleWeek(); }} placeholder="Busque um assunto" /><datalist id="week-topic-options">{topicBank.map(topic => <option key={topic.id} value={topic.title}>{topic.area}</option>)}</datalist><button onClick={addTopicToVisibleWeek}><Plus size={15} /> Incluir nesta semana</button></div><div className="weekly-topic-chips">{selectedTopicsThisWeek.length ? selectedTopicsThisWeek.map(topic => <span key={topic}>{topic}<button onClick={() => removeTopicFromVisibleWeek(topic)} aria-label={`Remover ${topic}`}><X size={13} /></button></span>) : <small>Nenhum assunto fixado; as 4 aulas serão automáticas.</small>}</div></div>}
    </section>

    <section className="panel agenda-panel">
      <div className="agenda-toolbar"><div><h2>Semana {weekOffset + 1} de {calendarWeeks} · {visibleDays[0]?.number} {visibleDays[0]?.month} a {visibleDays[6]?.number} {visibleDays[6]?.month}</h2><p>Ordem lógica por aprendizagem. Arraste, edite, exclua ou acrescente qualquer assunto.</p></div><div><button className="week-arrow" disabled={weekOffset === 0} onClick={() => setWeekOffset(value => Math.max(0, value - 1))} aria-label="Semana anterior"><ChevronRight size={17} /></button><button className="week-arrow next" disabled={weekOffset === calendarWeeks - 1} onClick={() => setWeekOffset(value => Math.min(calendarWeeks - 1, value + 1))} aria-label="Próxima semana"><ChevronRight size={17} /></button><button className="primary-button" onClick={() => { setNewBlock(previous => ({ ...previous, day: weekOffset * 7 })); setAddOpen(true); }}><Plus size={16} /> Adicionar bloco</button></div></div>
      <div className="interactive-week">
        {visibleDays.map(day => <div className={`day-column ${day.iso === new Date().toISOString().slice(0, 10) ? "today" : ""}`} key={day.iso} onDragOver={event => event.preventDefault()} onDrop={() => dragged && moveEvent(dragged, day.absolute)}>
          <header><span>{day.label}</span><strong>{day.number}</strong>{day.iso === new Date().toISOString().slice(0, 10) && <b>HOJE</b>}</header>
          <div className="day-events">
            {events.filter(event => event.day === day.absolute).map(event => <article className={`agenda-event ${event.type} ${event.completed ? "completed" : ""}`} draggable key={event.id} onDragStart={() => setDragged(event.id)}>
              <div className="event-top"><GripVertical size={13} /><span>{eventLabel(event.type)}</span><div><button onClick={() => setEditingEvent(event)} aria-label="Editar bloco"><Pencil size={11} /></button><button onClick={() => removeEvent(event.id)} aria-label="Remover bloco"><Trash2 size={11} /></button></div></div>
              <strong>{event.topic}</strong><small>{event.meta}</small>
              {topicBank.some(topic => topic.title === event.topic) && <button className={`event-study ${event.studied ? "done" : ""}`} onClick={() => markEventStudied(event.id, event.topic)}>{event.studied ? <Check size={13} /> : <BookOpenCheck size={13} />}{event.studied ? "Estudado" : "Marcar estudado"}</button>}<div className="event-move"><button disabled={day.absolute === 0} onClick={() => moveEvent(event.id, day.absolute - 1)} aria-label="Mover para o dia anterior">‹</button><button disabled={day.absolute === calendarLength - 1} onClick={() => moveEvent(event.id, day.absolute + 1)} aria-label="Mover para o próximo dia">›</button></div>
            </article>)}
            <button className="day-add" onClick={() => { setNewBlock(prev => ({ ...prev, day: day.absolute })); setAddOpen(true); }}><Plus size={14} /> adicionar</button>
          </div>
          <footer>{events.filter(event => event.day === day.absolute).length ? `${events.filter(event => event.day === day.absolute).length} blocos` : "Livre"}</footer>
        </div>)}
      </div>
    </section>

    <div className="three-cards"><MetricCard icon={<Gauge />} label="Aulas da semana" value={String(events.filter(event => event.type === "theory" && event.day >= weekOffset * 7 && event.day < weekOffset * 7 + 7).length)} note="meta de 4 · cerca de 2h cada" /><MetricCard icon={<Stethoscope />} label="Mistura planejada" value={`${focusPercentage}/${100 - focusPercentage}`} note="área-foco / outras áreas" /><MetricCard icon={<Layers3 />} label="Flashcards" value="todos os dias" note={`${Math.max(10, dailyCards)} cards adaptativos`} /></div>

    {rotationOpen && <div className="modal-backdrop" onMouseDown={() => setRotationOpen(false)}><div className="modal compact" role="dialog" aria-modal="true" aria-label="Editar rodízio" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">SINCRONIZAR INTERNATO</span><h2>Qual é seu rodízio atual?</h2><p>Ao aplicar, a grande área correspondente vira o foco da semana e os assuntos são ordenados pelas bancas.</p></div><button className="icon-button" onClick={() => setRotationOpen(false)}><X size={20} /></button></div><div className="rotation-form"><label>Área<select value={rotation.area} onChange={e => setRotation({ ...rotation, area: e.target.value })}><option>Nenhum rodízio cadastrado</option><option>Ginecologia e Obstetrícia</option><option>Clínica Médica</option><option>Cirurgia</option><option>Pediatria</option><option>Saúde Coletiva</option><option>Emergência</option></select></label><div className="two-fields"><label>Início<input type="date" value={rotation.start} onChange={e => setRotation({ ...rotation, start: e.target.value })} /></label><label>Fim<input type="date" value={rotation.end} onChange={e => setRotation({ ...rotation, end: e.target.value })} /></label></div><label className="range-label"><span><b>Quanto priorizar o rodízio?</b><strong>{rotation.boost}%</strong></span><input type="range" min="20" max="70" step="5" value={rotation.boost} onChange={e => setRotation({ ...rotation, boost: Number(e.target.value) })} /><small>O restante continua direcionado à incidência das suas bancas.</small></label></div><div className="modal-actions"><button className="text-button" onClick={() => setRotationOpen(false)}>Cancelar</button><button className="primary-button" onClick={applyRotation}><RefreshCw size={16} /> Aplicar à agenda</button></div></div></div>}

    {addOpen && <div className="modal-backdrop" onMouseDown={() => setAddOpen(false)}><div className="modal compact" role="dialog" aria-modal="true" aria-label="Adicionar bloco" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">AGENDA LIVRE</span><h2>Novo bloco de estudo</h2><p>Adicione qualquer assunto, mesmo fora da área-foco.</p></div><button className="icon-button" onClick={() => setAddOpen(false)}><X size={20} /></button></div><label className="plain-field">Assunto<input list="agenda-topic-options" value={newBlock.topic} onChange={e => setNewBlock({ ...newBlock, topic: e.target.value })} placeholder="Ex.: Rotura prematura de membranas" /><datalist id="agenda-topic-options">{topicBank.map(topic => <option value={topic.title} key={topic.id} />)}</datalist></label><div className="two-fields"><label>Dia<select value={newBlock.day} onChange={e => setNewBlock({ ...newBlock, day: Number(e.target.value) })}>{visibleDays.map(day => <option value={day.absolute} key={day.iso}>{day.label}, {day.number} {day.month}</option>)}</select></label><label>Tipo<select value={newBlock.type} onChange={e => setNewBlock({ ...newBlock, type: e.target.value as AgendaEvent["type"] })}><option value="theory">Teoria</option><option value="materials">Materiais</option><option value="questions">Questões</option><option value="review">Revisão</option><option value="cards">Flashcards</option><option value="mock">Prova completa</option><option value="correction">Correção de prova</option></select></label></div><label className="plain-field">Duração ou volume<input value={newBlock.meta} onChange={e => setNewBlock({ ...newBlock, meta: e.target.value })} placeholder="Ex.: 15 questões · 1h" /></label><div className="modal-actions"><button className="text-button" onClick={() => setAddOpen(false)}>Cancelar</button><button className="primary-button" onClick={saveBlock}><Plus size={16} /> Adicionar à agenda</button></div></div></div>}

    {editingEvent && <div className="modal-backdrop" onMouseDown={() => setEditingEvent(null)}><div className="modal compact" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">EDITAR CRONOGRAMA</span><h2>Alterar bloco</h2><p>Você não fica restrito às sugestões automáticas.</p></div><button className="icon-button" onClick={() => setEditingEvent(null)}><X size={20} /></button></div><label className="plain-field">Assunto<input list="edit-agenda-topics" value={editingEvent.topic} onChange={event => setEditingEvent({ ...editingEvent, topic: event.target.value })} /><datalist id="edit-agenda-topics">{topicBank.map(topic => <option value={topic.title} key={topic.id} />)}</datalist></label><div className="two-fields"><label>Dia<select value={editingEvent.day} onChange={event => setEditingEvent({ ...editingEvent, day: Number(event.target.value) })}>{calendarDays.map(day => <option value={day.absolute} key={day.iso}>{day.label}, {day.number} {day.month}</option>)}</select></label><label>Tipo<select value={editingEvent.type} onChange={event => setEditingEvent({ ...editingEvent, type: event.target.value as AgendaEvent["type"] })}><option value="theory">Teoria</option><option value="materials">Materiais</option><option value="questions">Questões</option><option value="review">Revisão</option><option value="cards">Flashcards</option><option value="mock">Prova completa</option><option value="correction">Correção</option></select></label></div><label className="plain-field">Duração ou volume<input value={editingEvent.meta} onChange={event => setEditingEvent({ ...editingEvent, meta: event.target.value })} /></label><div className="modal-actions split-actions"><button className="danger-button" onClick={() => removeEvent(editingEvent.id)}><Trash2 size={15} /> Excluir</button><button className="primary-button" onClick={saveEditedEvent}><Check size={16} /> Salvar alteração</button></div></div></div>}
  </div>;
}

function FlashcardsPage({ logs, exams, banks, dailyCards, setToast, profileId, studiedTopics, onOpenTopics, onSaveStatus }: { logs: QuestionLog[]; exams: MockExamRecord[]; banks: BankWeights; dailyCards: number; setToast: (message: string) => void; profileId: string; studiedTopics: string[]; onOpenTopics: () => void; onSaveStatus: (status: SaveStatus) => void }) {
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [xp, setXp] = useState(0);
  const [lastRating, setLastRating] = useState("");
  const [cardsHydrated, setCardsHydrated] = useState(false);
  const [customCards, setCustomCards] = useState<CustomFlashcard[]>([]);
  const [selectedCardTopics, setSelectedCardTopics] = useState<string[]>([]);
  const [examDeckEnabled, setExamDeckEnabled] = useState(true);
  const [topicDraft, setTopicDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [cardForm, setCardForm] = useState({ topic: "", area: "Clínica Médica" as StudyTopic["area"], front: "", back: "" });
  const cardsSaveQueue = useRef<Promise<void>>(Promise.resolve());

  const studiedTitles = topicBank.filter(topic => studiedTopics.includes(topic.id)).map(topic => topic.title);
  const weakTopics = logs.filter(log => log.accuracy < 75).map(log => log.topic);
  const examErrors = exams.flatMap(exam => exam.errors);
  const errorTopics = examErrors.map(error => error.topic);
  const chosenTitles = [...new Set([...studiedTitles, ...selectedCardTopics, ...weakTopics, ...errorTopics])];
  const preparedCards = medicalCardDeck.filter(card => chosenTitles.includes(card.topic) && !("examFocused" in card));
  const errorCards = examErrors.map(error => ({ topic: error.topic, area: error.area, front: `Erro de simulado: ${error.note}`, back: error.correction }));
  const generatedCards = topicBank.filter(topic => chosenTitles.includes(topic.title) && !medicalCardDeck.some(card => card.topic === topic.title)).map(topic => ({ topic: topic.title, area: topic.area, front: `Quais são os pontos essenciais para dominar ${topic.title}?`, back: "Revise definição, classificação, apresentação clínica, diagnóstico, conduta, complicações e os principais diferenciais cobrados em prova." }));
  const selectedBankWeight = Object.values(banks).reduce((sum, weight) => sum + weight, 0);
  const examQueueCards = useMemo(() => {
    if (!examDeckEnabled) return [];
    const topicScore = (topic: string) => bankPriorities.reduce((score, bank) => {
      if (!bank.topics.includes(topic)) return score;
      return score + (selectedBankWeight > 0 ? banks[bank.key] : 10);
    }, 0);
    return examFocusedCardDeck.slice().sort((a, b) => topicScore(b.topic) - topicScore(a.topic));
  }, [banks, examDeckEnabled, selectedBankWeight]);
  const activeDeck = [...customCards, ...errorCards, ...preparedCards, ...generatedCards, ...examQueueCards];
  const sessionGoal = activeDeck.length ? Math.min(45, Math.max(10, dailyCards, customCards.length + examErrors.length * 2 + selectedCardTopics.length * 3)) : 0;
  const card = activeDeck[current % Math.max(1, activeDeck.length)];
  const progress = sessionGoal ? Math.min(100, Math.round((answered / sessionGoal) * 100)) : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setCardsHydrated(false);
      const loadCards = async () => {
        const result = await supabase?.from("profile_states").select("data").eq("profile_id", profileId).eq("scope", "flashcards").maybeSingle();
        const localKey = `gps-flashcards-state-${profileId}`;
        let localData: { current?: number; answered?: number; xp?: number; customCards?: CustomFlashcard[]; selectedCardTopics?: string[]; examDeckEnabled?: boolean } | null = null;
        try { localData = JSON.parse(localStorage.getItem(localKey) ?? "null"); } catch { localData = null; }
        const parsed = (result?.data?.data as typeof localData) ?? localData;
        if (parsed) {
          setCurrent(parsed.current ?? 0); setAnswered(parsed.answered ?? 0); setXp(parsed.xp ?? 0);
          setCustomCards(parsed.customCards ?? []); setSelectedCardTopics(parsed.selectedCardTopics ?? []); setExamDeckEnabled(parsed.examDeckEnabled ?? true);
        } else { setCurrent(0); setAnswered(0); setXp(0); setCustomCards([]); setSelectedCardTopics([]); setExamDeckEnabled(true); }
        setCardsHydrated(true);
      };
      loadCards();
    }, 0);
    return () => clearTimeout(timer);
  }, [profileId]);

  useEffect(() => {
    if (!cardsHydrated || !supabase || profileId === "joao") return;
    const client = supabase;
    const state = { current, answered, xp, customCards, selectedCardTopics, examDeckEnabled };
    localStorage.setItem(`gps-flashcards-state-${profileId}`, JSON.stringify(state));
    onSaveStatus("saving");
    cardsSaveQueue.current = cardsSaveQueue.current.then(async () => {
      const { error } = await client.from("profile_states").upsert({ profile_id: profileId, scope: "flashcards", data: state, updated_at: new Date().toISOString() });
      if (error) { onSaveStatus("error"); setToast(`Falha ao salvar flashcards: ${error.message}`); }
      else onSaveStatus("saved");
    });
  }, [current, answered, xp, customCards, selectedCardTopics, examDeckEnabled, cardsHydrated, profileId, onSaveStatus, setToast]);

  function rate(label: string, points: number) {
    setAnswered(value => value + 1); setXp(value => value + points); setLastRating(label); setRevealed(false); setCurrent(value => value + 1);
    if (answered + 1 === sessionGoal) setToast("Meta diária concluída! Sequência protegida e +100 XP.");
  }

  function chooseTopic() {
    const topic = topicDraft.trim();
    if (!topic) return setToast("Escolha um assunto para a fila diária.");
    if (selectedCardTopics.includes(topic)) return setToast("Esse assunto já está na fila de flashcards.");
    setSelectedCardTopics(previous => [...previous, topic]); setTopicDraft(""); setToast(`${topic} foi incluído na fila diária, independentemente do cronograma.`);
  }

  function createCard() {
    if (!cardForm.topic.trim() || !cardForm.front.trim() || !cardForm.back.trim()) return setToast("Preencha assunto, pergunta e resposta.");
    setCustomCards(previous => [{ id: Date.now(), topic: cardForm.topic.trim(), area: cardForm.area, front: cardForm.front.trim(), back: cardForm.back.trim(), createdAt: new Date().toISOString() }, ...previous]);
    setCardForm({ topic: "", area: "Clínica Médica", front: "", back: "" }); setCreateOpen(false); setToast("Flashcard criado e incluído na sua fila diária.");
  }

  const topicRecommendations = logs.slice().sort((a,b) => a.accuracy - b.accuracy).slice(0,4).map(log => ({ ...log, cards: log.accuracy < 60 ? 10 : log.accuracy < 70 ? 7 : 4 }));

  return <div className="page-stack">
    <section className="cards-hero">
      <div><span className="cards-level"><Zap size={14} fill="currentColor" /> NÍVEL 1 · {xp} XP</span><h2>Flashcards todos os dias, do seu jeito.</h2><p>A fila mistura seus erros, assuntos escolhidos, conteúdos estudados e cards criados por você — sem depender do foco do cronograma.</p>{sessionGoal > 0 && <div className="daily-progress"><div><i style={{ width: `${progress}%` }} /></div><span><b>{answered}</b> de {sessionGoal} concluídos</span></div>}<div className="card-hero-actions"><button className="primary-button" onClick={() => setCreateOpen(true)}><Plus size={16} /> Criar flashcard</button><button className="outline-button" onClick={onOpenTopics}><LibraryBig size={16} /> Ver assuntos</button></div></div>
      <div className="streak-orbit"><FlameIcon /><strong>0</strong><span>dias seguidos</span></div>
    </section>

    <section className="panel card-choice-panel"><div><h2>Escolha qualquer assunto para a fila</h2><p>Ele não precisa estar na agenda nem ser o foco da semana.</p></div><div><input list="card-topic-options" value={topicDraft} onChange={event => setTopicDraft(event.target.value)} placeholder="Digite ou escolha um assunto" onKeyDown={event => { if (event.key === "Enter") chooseTopic(); }} /><datalist id="card-topic-options">{topicBank.map(topic => <option value={topic.title} key={topic.id} />)}</datalist><button onClick={chooseTopic}><Plus size={16} /> Adicionar</button></div>{selectedCardTopics.length > 0 && <div className="weekly-topic-chips">{selectedCardTopics.map(topic => <span key={topic}>{topic}<button onClick={() => setSelectedCardTopics(previous => previous.filter(item => item !== topic))}><X size={13} /></button></span>)}</div>}</section>

    <section className={`panel unified-deck-panel ${examDeckEnabled ? "enabled" : ""}`}>
      <div className="unified-deck-icon"><BrainCircuit size={23} /></div>
      <div><span className="section-kicker">BANCO UNIFICADO DE PROVA</span><h2>{examFocusedCardDeck.length} cartões em estilo de questão</h2><p>Uma fila única, sem divisão por instituição. As bancas escolhidas só aumentam internamente a prioridade dos assuntos mais relevantes para a sua rota.</p></div>
      <button className={examDeckEnabled ? "active" : ""} onClick={() => { setExamDeckEnabled(value => !value); setCurrent(0); setToast(examDeckEnabled ? "Banco de prova pausado. Seus erros e cards pessoais continuam ativos." : "Banco unificado incluído na fila diária."); }}><span>{examDeckEnabled ? "Ativo" : "Pausado"}</span><i /></button>
    </section>

    {card ? <section className="flash-layout">
      <div className="flash-session">
        <div className="flash-session-top"><div><span className="topic-chip">{card.area}</span><small>{card.topic}</small></div><span>{Math.min(answered + 1, sessionGoal)} / {sessionGoal}</span></div>
        <button className={`flash-card ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)} aria-label={revealed ? "Resposta revelada" : "Revelar resposta"}><div className="card-face question-face"><BookMarked size={27} /><span>PERGUNTA</span><h3>{card.front}</h3>{!revealed && <em>Clique para revelar a resposta</em>}</div>{revealed && <div className="answer-box"><span>RESPOSTA</span><p>{card.back}</p></div>}</button>
        {!revealed ? <button className="reveal-button" onClick={() => setRevealed(true)}><Sparkles size={17} /> Mostrar resposta</button> : <div className="rating-area"><p>Como foi lembrar deste conteúdo?</p><div><button className="hard" onClick={() => rate("Difícil", 12)}><Frown size={20} /><span><b>Difícil</b><small>rever amanhã</small></span></button><button className="medium" onClick={() => rate("Médio", 18)}><Meh size={20} /><span><b>Médio</b><small>rever em 4 dias</small></span></button><button className="easy" onClick={() => rate("Fácil", 24)}><Smile size={20} /><span><b>Fácil</b><small>rever em 12 dias</small></span></button></div></div>}
        {lastRating && <div className="micro-reward"><Zap size={14} /> Último card: {lastRating}. O intervalo já foi recalculado.</div>}
      </div>
      <aside className="cards-sidebar"><div className="panel"><div className="panel-title"><div><h2>Origem da fila</h2><p>O GPS aumenta a repetição quando encontra erros.</p></div></div><div className="queue-sources"><span><b>{examErrors.length}</b> erros de simulados</span><span><b>{customCards.length}</b> cards criados por você</span><span><b>{selectedCardTopics.length}</b> assuntos escolhidos</span><span><b>{examDeckEnabled ? examFocusedCardDeck.length : 0}</b> cards estilo prova</span></div><div className="recommend-list">{topicRecommendations.map(item => <article key={item.id}><div><strong>{item.topic}</strong><span>{item.questions} questões · {item.accuracy}% de acerto</span></div><b>{item.cards}<small> cards</small></b></article>)}</div></div><div className="panel interval-legend"><h2>Repetição adaptativa</h2><p><span className="dot hard" /> Difícil: alta frequência</p><p><span className="dot medium" /> Médio: frequência moderada</p><p><span className="dot easy" /> Fácil: menor frequência</p></div></aside>
    </section> : <section className="fresh-empty hero-empty"><div className="fresh-empty-icon"><Layers3 size={30} /></div><h2>Sua fila está pronta para começar</h2><p>Escolha um assunto acima ou crie seu primeiro flashcard. Não é necessário alterar o cronograma.</p><button className="primary-button" onClick={() => setCreateOpen(true)}><Plus size={16} /> Criar primeiro flashcard</button></section>}

    {createOpen && <div className="modal-backdrop" onMouseDown={() => setCreateOpen(false)}><div className="modal compact" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">FLASHCARD PERSONALIZADO</span><h2>Criar novo flashcard</h2><p>O card entrará na fila diária mesmo que o assunto não esteja no cronograma.</p></div><button className="icon-button" onClick={() => setCreateOpen(false)}><X size={20} /></button></div><label className="plain-field">Assunto<input value={cardForm.topic} onChange={event => setCardForm({ ...cardForm, topic: event.target.value })} placeholder="Ex.: Insuficiência cardíaca" /></label><label className="plain-field">Grande área<select value={cardForm.area} onChange={event => setCardForm({ ...cardForm, area: event.target.value as StudyTopic["area"] })}>{STUDY_AREAS.map(area => <option key={area}>{area}</option>)}</select></label><label className="plain-field">Pergunta<textarea value={cardForm.front} onChange={event => setCardForm({ ...cardForm, front: event.target.value })} placeholder="O que eu quero lembrar?" /></label><label className="plain-field">Resposta<textarea value={cardForm.back} onChange={event => setCardForm({ ...cardForm, back: event.target.value })} placeholder="Resposta curta e objetiva" /></label><div className="modal-actions"><button className="text-button" onClick={() => setCreateOpen(false)}>Cancelar</button><button className="primary-button" onClick={createCard}><Check size={16} /> Salvar flashcard</button></div></div></div>}
  </div>;
}

function QuestionsPage({ logs, setLogs, setToast, setStudiedTopics }: { logs: QuestionLog[]; setLogs: React.Dispatch<React.SetStateAction<QuestionLog[]>>; setToast: (message: string) => void; setStudiedTopics: React.Dispatch<React.SetStateAction<string[]>> }) {
  const [form, setForm] = useState({ topic: "", area: "Ginecologia e Obstetrícia", questions: 20, accuracy: 60 });
  const total = logs.reduce((sum, log) => sum + log.questions, 0);
  const weighted = total ? Math.round(logs.reduce((sum, log) => sum + log.questions * log.accuracy, 0) / total) : 0;
  const weakest = logs.slice().sort((a,b) => a.accuracy - b.accuracy)[0];

  function saveLog() {
    if (!form.topic.trim()) return setToast("Informe o assunto das questões.");
    setLogs(prev => [{ id: Date.now(), topic: form.topic, area: form.area === "Ginecologia e Obstetrícia" ? "GO" : form.area, questions: form.questions, accuracy: form.accuracy, date: new Date().toISOString().slice(0, 10) }, ...prev]);
    const matched = topicBank.find(topic => topic.title.toLocaleLowerCase("pt-BR") === form.topic.trim().toLocaleLowerCase("pt-BR"));
    if (matched) setStudiedTopics(prev => prev.includes(matched.id) ? prev : [...prev, matched.id]);
    setForm({ ...form, topic: "" });
    setToast("Desempenho salvo. Flashcards e agenda diária recalculados.");
  }

  return <div className="page-stack">
    <div className="three-cards"><MetricCard icon={<ListChecks />} label="Questões registradas" value={String(total)} note="base do plano adaptativo" /><MetricCard icon={<Target />} label="Acerto ponderado" value={`${weighted}%`} note="considera o volume feito" /><MetricCard icon={<BrainCircuit />} label="Maior oportunidade" value={weakest?.accuracy ? `${weakest.accuracy}%` : "—"} note={weakest?.topic ?? "sem dados"} /></div>
    <section className="question-grid">
      <div className="panel log-form-panel"><div className="panel-title"><div><h2>Registrar desempenho</h2><p>Digite quantas questões fez e seu percentual de acerto.</p></div></div><label className="plain-field">Assunto<input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Ex.: Diabetes gestacional" /></label><div className="two-fields"><label>Grande área<select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}><option>Ginecologia e Obstetrícia</option><option>Clínica Médica</option><option>Cirurgia</option><option>Pediatria</option><option>Preventiva</option></select></label><label>Quantidade<input type="number" min="1" value={form.questions} onChange={e => setForm({ ...form, questions: Number(e.target.value) })} /></label></div><label className="accuracy-slider"><span><b>Percentual de acerto</b><strong>{form.accuracy}%</strong></span><input type="range" min="0" max="100" value={form.accuracy} onChange={e => setForm({ ...form, accuracy: Number(e.target.value) })} /><div><span>Precisa reforçar</span><span>Domínio alto</span></div></label><div className="calculation-preview"><BrainCircuit size={20} /><div><strong>Impacto no plano</strong><p>{form.accuracy < 50 ? "Alta prioridade: próxima revisão em 3 dias e progressão encurtada." : form.accuracy < 70 ? "Prioridade moderada: próxima revisão em 4 dias." : "Consolidação: próxima revisão em 5 dias, ampliando depois se o desempenho continuar alto."}</p></div></div><button className="primary-button save-log" onClick={saveLog}><Check size={17} /> Salvar e recalcular</button></div>
      <div className="panel"><div className="panel-title"><div><h2>Histórico por assunto</h2><p>O registro mais recente é o que redefine a próxima revisão.</p></div></div>{logs.length ? <div className="log-list">{logs.map(log => <article key={log.id}><div className={`log-score ${log.accuracy < 50 ? "low" : log.accuracy < 70 ? "mid" : "high"}`}><strong>{log.accuracy}%</strong><span>acerto</span></div><div><strong>{log.topic}</strong><span>{log.area} · {log.date}</span></div><div className="log-volume"><b>{log.questions}</b><span>questões</span></div><div className="card-suggestion"><Layers3 size={14} /><b>{log.accuracy < 50 ? 10 : log.accuracy < 70 ? 7 : 4}</b><span>cards/dia</span></div></article>)}</div> : <EmptyMini icon={<ListChecks size={22} />} title="Nenhuma questão registrada" text="Este perfil ainda não tem histórico." />}</div>
    </section>
  </div>;
}

function TopicsPage({ studiedTopics, setStudiedTopics, setToast, focusArea, weeklyTopics, setWeeklyTopics }: { studiedTopics: string[]; setStudiedTopics: React.Dispatch<React.SetStateAction<string[]>>; setToast: (message: string) => void; focusArea: FocusArea; weeklyTopics: string[]; setWeeklyTopics: React.Dispatch<React.SetStateAction<string[]>> }) {
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

  function toggleWeeklyTopic(topic: StudyTopic) {
    const selected = weeklyTopics.includes(topic.title);
    setWeeklyTopics(previous => selected ? previous.filter(title => title !== topic.title) : [...previous, topic.title]);
    setToast(selected ? `${topic.title} foi retirado desta semana.` : `${topic.title} foi incluído como complemento da semana.`);
  }

  return <div className="page-stack">
    <div className="topic-summary">
      <div><LibraryBig size={23} /><span><strong>{topicBank.length}</strong><small>assuntos cadastrados</small></span></div>
      <div><BookOpenCheck size={23} /><span><strong>{studiedTopics.length}</strong><small>estudados</small></span></div>
      <div><Layers3 size={23} /><span><strong>{medicalCardDeck.length}</strong><small>cards no banco</small></span></div>
    </div>
    <section className={`current-focus-card ${focusArea ? "configured" : ""}`}><div><MapPinned size={23} /><span><small>GRANDE ÁREA DA SEMANA</small><strong>{focusArea || "Ainda não definida"}</strong><p>Os assuntos principais são escolhidos pela incidência das bancas. Abaixo, você pode incluir temas específicos sem trocar o foco da área.</p></span></div>{weeklyTopics.length > 0 && <button onClick={() => setWeeklyTopics([])}>Limpar complementos</button>}</section>
    <section className="panel topics-panel">
      <div className="topics-toolbar"><div className="topic-search"><Search size={18} /><input aria-label="Buscar assunto" placeholder="Buscar assunto..." value={search} onChange={event => setSearch(event.target.value)} /></div><div className="area-filters">{areas.map(item => <button className={area === item ? "active" : ""} key={item} onClick={() => setArea(item)}>{item}</button>)}</div></div>
      <div className="topics-head"><span>{filtered.length} assuntos encontrados</span><small>Todos começaram como “Não estudado”</small></div>
      <div className="topics-list">{filtered.map(topic => { const studied = studiedTopics.includes(topic.id); const included = weeklyTopics.includes(topic.title); return <article className={included ? "focused-topic" : ""} key={topic.id}><div className={`topic-state ${studied ? "studied" : ""}`}>{studied ? <Check size={16} /> : <BookMarked size={16} />}</div><div><span>{topic.area}</span><strong>{topic.title}</strong></div><em className={studied ? "studied" : ""}>{studied ? "Estudado" : "Não estudado"}</em><div className="topic-actions"><button className={included ? "focus-active" : ""} onClick={() => toggleWeeklyTopic(topic)}>{included ? "Na semana" : "Incluir na semana"}</button><button onClick={() => toggleTopic(topic)}>{studied ? "Desmarcar" : "Marcar estudado"}</button></div></article>})}</div>
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

function SimuladosPage({ exams, setExams, setToast }: { exams: MockExamRecord[]; setExams: React.Dispatch<React.SetStateAction<MockExamRecord[]>>; setToast: (message: string) => void }) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({ bank: "ENARE", year: currentYear, date: new Date().toISOString().slice(0, 10), correct: 0, total: 100 });
  const [errorDraft, setErrorDraft] = useState({ topic: "", area: "Clínica Médica" as StudyTopic["area"], note: "", correction: "" });
  const [errors, setErrors] = useState<MockExamError[]>([]);
  const scores = exams.map(exam => Math.round(exam.correct / exam.total * 100));
  const best = scores.length ? Math.max(...scores) : 0;
  const totalErrors = exams.reduce((sum, exam) => sum + exam.errors.length, 0);

  function addError() {
    if (!errorDraft.topic.trim() || !errorDraft.note.trim() || !errorDraft.correction.trim()) return setToast("Preencha o assunto, o erro cometido e a correção.");
    setErrors(previous => [...previous, { id: Date.now(), topic: errorDraft.topic.trim(), area: errorDraft.area, note: errorDraft.note.trim(), correction: errorDraft.correction.trim() }]);
    setErrorDraft(previous => ({ ...previous, topic: "", note: "", correction: "" }));
    setToast("Erro incluído. Ele também alimentará sua fila de flashcards.");
  }

  function saveExam() {
    if (form.total <= 0 || form.correct < 0 || form.correct > form.total) return setToast("Confira o total de questões e a quantidade de acertos.");
    const exam: MockExamRecord = { id: Date.now(), ...form, errors };
    setExams(previous => [exam, ...previous]);
    setForm({ bank: "ENARE", year: currentYear, date: new Date().toISOString().slice(0, 10), correct: 0, total: 100 }); setErrors([]);
    setToast("Simulado, resultado e erros salvos na nuvem. A fila de flashcards foi recalculada.");
  }

  return <div className="page-stack">
    <div className="three-cards"><MetricCard icon={<ClipboardCheck />} label="Provas cadastradas" value={String(exams.length)} note={exams.length ? "histórico salvo" : "nenhum simulado"} /><MetricCard icon={<TrendingUp />} label="Melhor resultado" value={scores.length ? `${best}%` : "—"} note="percentual bruto" /><MetricCard icon={<BrainCircuit />} label="Erros registrados" value={String(totalErrors)} note="alimentam os flashcards" /></div>
    <section className="exam-grid">
      <div className="panel exam-form-panel"><div className="panel-title"><div><h2>Cadastrar simulado completo</h2><p>Registre a nota e detalhe os erros para transformar cada falha em revisão.</p></div></div><div className="two-fields"><label>Banca<select value={form.bank} onChange={event => setForm({ ...form, bank: event.target.value })}>{bankPriorities.map(bank => <option key={bank.key}>{bank.name}</option>)}</select></label><label>Ano da prova<input type="number" min="2000" max="2100" value={form.year} onChange={event => setForm({ ...form, year: Number(event.target.value) })} /></label></div><div className="three-form-fields"><label>Data realizada<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Total de questões<input type="number" min="1" value={form.total} onChange={event => setForm({ ...form, total: Number(event.target.value) })} /></label><label>Acertos<input type="number" min="0" max={form.total} value={form.correct} onChange={event => setForm({ ...form, correct: Number(event.target.value) })} /></label></div><div className="exam-score-preview"><span>RESULTADO</span><strong>{form.total > 0 ? Math.round(form.correct / form.total * 100) : 0}%</strong><small>{form.correct} de {form.total} questões</small></div>
        <div className="error-builder"><div><h3>Registrar seus erros</h3><p>Você pode adicionar quantos erros quiser antes de salvar o simulado.</p></div><div className="two-fields"><label>Assunto<input list="exam-error-topics" value={errorDraft.topic} onChange={event => setErrorDraft({ ...errorDraft, topic: event.target.value })} placeholder="Ex.: Trauma torácico" /><datalist id="exam-error-topics">{topicBank.map(topic => <option value={topic.title} key={topic.id} />)}</datalist></label><label>Grande área<select value={errorDraft.area} onChange={event => setErrorDraft({ ...errorDraft, area: event.target.value as StudyTopic["area"] })}>{STUDY_AREAS.map(area => <option key={area}>{area}</option>)}</select></label></div><label>O que você errou?<textarea value={errorDraft.note} onChange={event => setErrorDraft({ ...errorDraft, note: event.target.value })} placeholder="Ex.: Confundi a indicação de drenagem" /></label><label>Qual é a informação correta?<textarea value={errorDraft.correction} onChange={event => setErrorDraft({ ...errorDraft, correction: event.target.value })} placeholder="Escreva a resposta ou conduta correta. Isso virará um flashcard." /></label><button className="outline-button" onClick={addError}><Plus size={16} /> Adicionar erro ao simulado</button>{errors.length > 0 && <div className="draft-errors">{errors.map(error => <article key={error.id}><div><span>{error.area}</span><strong>{error.topic}</strong><small>{error.note}</small></div><button onClick={() => setErrors(previous => previous.filter(item => item.id !== error.id))}><X size={15} /></button></article>)}</div>}</div><button className="primary-button save-exam" onClick={saveExam}><Check size={17} /> Salvar simulado e erros</button>
      </div>
      <div className="panel"><div className="panel-title"><div><h2>Histórico de simulados</h2><p>Resultados e caderno de erros por prova.</p></div></div>{exams.length ? <div className="exam-history">{exams.map(exam => <article key={exam.id}><header><div><span>{exam.bank} · {exam.year}</span><strong>{Math.round(exam.correct / exam.total * 100)}%</strong><small>{exam.correct}/{exam.total} acertos · {exam.date.split("-").reverse().join("/")}</small></div><b>{exam.errors.length} erros registrados</b></header>{exam.errors.length > 0 && <div className="saved-errors">{exam.errors.map(error => <div key={error.id}><span>{error.area}</span><strong>{error.topic}</strong><p>{error.note}</p><small>Correção: {error.correction}</small></div>)}</div>}</article>)}</div> : <EmptyMini icon={<ClipboardCheck size={22} />} title="Nenhum simulado cadastrado" text="Preencha o formulário ao lado para iniciar seu histórico." />}</div>
    </section>
  </div>;
}

function ReviewsPage() {
  return <div className="page-stack"><div className="review-hero"><div><CalendarClock size={26} /><span><b>0 revisões</b><small>agendadas</small></span></div><div><Clock3 size={26} /><span><b>0h</b><small>tempo estimado</small></span></div><div><BrainCircuit size={26} /><span><b>—</b><small>retenção estimada</small></span></div></div><section className="fresh-empty"><div className="fresh-empty-icon"><CalendarClock size={28} /></div><h2>Sua fila de revisão está vazia</h2><p>Marque um assunto como estudado para criar a primeira revisão.</p></section></div>;
}

function GoalsPage({ banks, target, focusArea, onEdit }: { banks: BankWeights; target:number; focusArea: FocusArea; onEdit:()=>void }) {
  const configuredBanks = bankPriorities.filter(bank => banks[bank.key] > 0);
  const total = Object.values(banks).reduce((sum, value) => sum + value, 0);
  return <div className="page-stack"><div className="goal-hero"><div><span className="section-kicker">SUPER PLANNER PERSONALIZADO</span><h2>{configuredBanks.length ? configuredBanks.map(bank => `${bank.name} ${banks[bank.key]}%`).join(", ") : "Nenhuma banca configurada"}</h2><p>{configuredBanks.length ? `Grande área da semana: ${focusArea || "a definir"}. Dentro dela, a rotina ordena os assuntos pela incidência das bancas e pelo desempenho.` : "Escolha as bancas e distribua 100% dos pesos para iniciar seu plano."}</p><button className="primary-button" onClick={onEdit}><Settings size={17}/> Configurar composição</button></div><div className="donut empty-donut"><div><strong>{total}%</strong><span>direcionado</span></div></div></div><div className="three-cards"><MetricCard icon={<Target/>} label="Meta principal" value={target ? `${target}%` : "—"} note={target ? "nota desejada" : "não definida"}/><MetricCard icon={<Flag/>} label="Data da prova" value="—" note="não informada"/><MetricCard icon={<GraduationCap/>} label="Ponto de partida" value="0%" note="conhecimento inicial assumido"/></div></div>;
}

function MetricCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <article className="metric-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

function EmptyMini({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="empty-mini"><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></div>;
}
