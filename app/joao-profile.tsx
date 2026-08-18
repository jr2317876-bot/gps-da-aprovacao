"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CloudOff,
  Gauge,
  GripVertical,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { bankPriorities, topicBank, type StudyTopic } from "./topics";
import { supabase } from "@/lib/supabase";

const JOAO_START_ISO = "2026-08-24";
const THEORY_TARGET_ISO = "2027-11-30";
const WEEKLY_REFERENCE_HOURS = 12;
const AREAS: StudyTopic["area"][] = ["Clínica Médica", "Cirurgia", "Ginecologia e Obstetrícia", "Pediatria", "Preventiva"];

type Priority = "P1" | "P2" | "P3";
type TopicSize = "Pequeno" | "Médio" | "Grande";
type ReviewMode = "Questões" | "Flashcards" | "Questões + flashcards" | "Manutenção";
type ReviewChoice = "Automático" | ReviewMode;
type ReviewStatus = "Urgente" | "Em breve" | "Consolidado";
type TaskKind = "topic" | "faculty" | "review" | "maintenance" | "simulation" | "update";
type TaskSource = "Residência" | "Faculdade" | "Faculdade + Residência";
type ObligationType = "Nenhuma" | "Prova" | "Seminário" | "Tutoria/PBL/TBL" | "Trabalho" | "Outra obrigação";
type ErrorCause = "Não sabia o conteúdo" | "Esqueci informação" | "Confundi conceitos" | "Erro de raciocínio/conduta" | "Desatenção";

type MatrixTopic = StudyTopic & {
  subarea: string;
  priority: Priority;
  iamspePriority: number;
  sesPriority: number;
  combinedPriority: number;
  size: TopicSize;
  update2028: boolean;
};

type TopicProgress = {
  theory: boolean;
  questions: boolean;
  flashcards: boolean;
  flashcardsRequired: boolean;
  accuracy?: number;
  lastContact?: string;
  security?: number;
  questionNeed?: number;
  flashcardNeed?: number;
  errorCause?: ErrorCause;
  reviewMode: ReviewMode;
  reviewStatus: ReviewStatus;
  actualHours?: number;
};

type WeekTask = {
  id: string;
  kind: TaskKind;
  topicId?: string;
  linkedTopicIds?: string[];
  title: string;
  area: StudyTopic["area"];
  subarea: string;
  priority: Priority;
  source: TaskSource;
  estimatedHours: number;
  actualHours?: number;
  durationLearned?: boolean;
  theory: boolean;
  questions: boolean;
  flashcards: boolean;
  flashcardsRequired: boolean;
  questionGoal: string;
  reviewMode: ReviewMode;
  completed: boolean;
  manual: boolean;
  order: number;
};

type WeekPlan = {
  weekStart: string;
  hoursAvailable: number;
  facultyTopics: string[];
  obligationType: ObligationType;
  obligationDate: string;
  obligationNote: string;
  tasks: WeekTask[];
  generated: boolean;
  closed: boolean;
  completion: number;
  status: "Semana cumprida" | "Atenção" | "Atraso semanal relevante" | "Em andamento";
  balanceDelta: number;
};

type DetailedQuestionLog = {
  id: string;
  date: string;
  topicId: string;
  topic: string;
  area: StudyTopic["area"];
  questions: number;
  accuracy: number;
  security: number;
  questionNeed: number;
  flashcardNeed: number;
  errorCause: ErrorCause;
  reviewMode: ReviewMode;
};

type SimulationLog = {
  id: string;
  date: string;
  bank: "IAMSPE" | "SES-PE";
  questions: number;
  accuracy: number;
};

type JoaoState = {
  version: number;
  revision: number;
  weeks: Record<string, WeekPlan>;
  progress: Record<string, TopicProgress>;
  questionLogs: DetailedQuestionLog[];
  simulations: SimulationLog[];
  balanceHours: number;
  durationHistory: Record<TopicSize, number[]>;
};

const emptyState = (): JoaoState => ({
  version: 2,
  revision: 0,
  weeks: {},
  progress: {},
  questionLogs: [],
  simulations: [],
  balanceHours: 0,
  durationHistory: { Pequeno: [], Médio: [], Grande: [] },
});

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");

function localIso(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localIso(date);
}

function mondayOf(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localIso(date);
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000);
}

function humanWeek(weekStart: string) {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

function inferSubarea(topic: StudyTopic) {
  const title = normalize(topic.title);
  if (topic.area === "Preventiva") return /sus|atencao primaria|vigilancia|notificacao/.test(title) ? "SUS, APS e Vigilância" : "Epidemiologia e Bioestatística";
  if (topic.area === "Cirurgia") return /trauma|queimadura|abcde/.test(title) ? "Trauma" : /ortop|fratura|luxac|tendin/.test(title) ? "Ortopedia" : /urolog/.test(title) ? "Urologia" : "Cirurgia Geral";
  if (topic.area === "Ginecologia e Obstetrícia") return /gesta|parto|pre-natal|puerper|fetal|membrana|prematuro|morte materna/.test(title) ? "Obstetrícia" : /mama/.test(title) ? "Mastologia" : "Ginecologia";
  if (topic.area === "Pediatria") return /neonatal|sala de parto|alojamento/.test(title) ? "Neonatologia" : /crescimento|nutricao|carencia|puber/.test(title) ? "Pediatria Geral" : "Especialidades Pediátricas";
  if (/coronar|card|hipertens|arrit|valv/.test(title)) return "Cardiologia";
  if (/diabetes|tireo|suprarrenal|metabol/.test(title)) return "Endocrinologia";
  if (/renal|glomer|eletrol|acidobas|urinari/.test(title)) return "Nefrologia";
  if (/avc|cefale|neurol|snc|vertig/.test(title)) return "Neurologia";
  if (/anemia|hemato|hemostasia|trombot/.test(title)) return "Hematologia";
  if (/pulmon|pneumo|obstrutiv|embolia/.test(title)) return "Pneumologia";
  if (/artrite|colagen|vasculite|miopatia/.test(title)) return "Reumatologia";
  if (/transtorno|alcool|tabaco|substancia/.test(title)) return "Psiquiatria";
  if (/hiv|tubercul|infecc|febril|fung|parasito/.test(title)) return "Infectologia";
  return "Clínica Geral";
}

function inferSize(topic: StudyTopic): TopicSize {
  const title = normalize(topic.title);
  if (/diabetes|hipertens|insuficiencia cardiaca|pre-natal|assistencia ao parto|sepse|abdome agudo|imunizacoes|hiv|cirrose|trauma/.test(title)) return "Grande";
  if (title.length > 36 || /tumores|sindromes|disturbios|doencas/.test(title)) return "Médio";
  return "Pequeno";
}

function priorityPosition(bankKey: "iamspe" | "sespe", title: string) {
  const bank = bankPriorities.find(item => item.key === bankKey);
  const index = bank?.topics.findIndex(item => normalize(item) === normalize(title)) ?? -1;
  return index < 0 ? 0 : 10 - index;
}

const matrixTopics: MatrixTopic[] = topicBank.map((topic, index) => {
  const iamspePriority = priorityPosition("iamspe", topic.title);
  const sesPriority = priorityPosition("sespe", topic.title);
  const combinedPriority = (iamspePriority + sesPriority) / 2;
  const recurrent = iamspePriority > 0 || sesPriority > 0;
  const priority: Priority = combinedPriority >= 5 || (recurrent && Math.max(iamspePriority, sesPriority) >= 7) ? "P1" : recurrent || index % 3 !== 2 ? "P2" : "P3";
  const update2028 = /hipertens|diabetes|imuniz|rastreamento|pre-natal|abcde|vigilancia|atencao primaria|etica|trauma|pneumonia|sepse/.test(normalize(topic.title));
  return { ...topic, subarea: inferSubarea(topic), priority, iamspePriority, sesPriority, combinedPriority, size: inferSize(topic), update2028 };
});

function defaultProgress(): TopicProgress {
  return { theory: false, questions: false, flashcards: false, flashcardsRequired: false, reviewMode: "Manutenção", reviewStatus: "Em breve" };
}

function deriveReview(accuracy: number, security: number, questionNeed: number, flashcardNeed: number, cause: ErrorCause): { mode: ReviewMode; status: ReviewStatus; flashcardsRequired: boolean } {
  const memoryCause = cause === "Esqueci informação" || cause === "Confundi conceitos";
  const reasoningCause = cause === "Não sabia o conteúdo" || cause === "Erro de raciocínio/conduta";
  const memoryWeak = memoryCause && flashcardNeed >= 5;
  const reasoningWeak = reasoningCause || questionNeed >= 6;
  const mode: ReviewMode = cause === "Desatenção" && accuracy >= 70 ? "Manutenção" : memoryWeak && reasoningWeak ? "Questões + flashcards" : memoryWeak ? "Flashcards" : reasoningWeak ? "Questões" : "Manutenção";
  const need = (100 - accuracy) * 0.45 + (10 - security) * 3 + questionNeed * 2 + flashcardNeed * 1.5;
  return { mode, status: need >= 48 ? "Urgente" : need >= 25 ? "Em breve" : "Consolidado", flashcardsRequired: memoryWeak };
}

function recalculateTopicFromLogs(current: TopicProgress, logs: DetailedQuestionLog[], topicId: string): TopicProgress {
  const latest = logs.filter(log => log.topicId === topicId).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return { ...current, questions: false, accuracy: undefined, security: undefined, questionNeed: undefined, flashcardNeed: undefined, errorCause: undefined, reviewMode: "Manutenção", reviewStatus: "Em breve", flashcardsRequired: false };
  const derived = deriveReview(latest.accuracy, latest.security, latest.questionNeed, latest.flashcardNeed, latest.errorCause);
  const flashcardsRequired = latest.reviewMode === "Flashcards" || latest.reviewMode === "Questões + flashcards";
  return { ...current, questions: true, accuracy: latest.accuracy, security: latest.security, questionNeed: latest.questionNeed, flashcardNeed: latest.flashcardNeed, errorCause: latest.errorCause, reviewMode: latest.reviewMode, reviewStatus: derived.status, flashcardsRequired, lastContact: latest.date };
}

function estimateHours(topic: MatrixTopic, history: JoaoState["durationHistory"]) {
  const values = history[topic.size];
  if (values.length) return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 2) / 2;
  return topic.size === "Grande" ? 4 : topic.size === "Médio" ? 2.5 : 1.5;
}

function removeDurationSamples(history: JoaoState["durationHistory"], tasks: WeekTask[]) {
  const next = { Pequeno: [...history.Pequeno], Médio: [...history.Médio], Grande: [...history.Grande] };
  tasks.forEach(task => {
    if (!task.durationLearned || !task.topicId || !task.actualHours) return;
    const topic = matrixTopics.find(item => item.id === task.topicId);
    if (!topic) return;
    const index = next[topic.size].lastIndexOf(task.actualHours);
    if (index >= 0) next[topic.size].splice(index, 1);
  });
  return next;
}

function taskProgress(task: WeekTask) {
  if (["review", "maintenance", "simulation", "update"].includes(task.kind)) return task.completed ? 1 : 0;
  const required = [task.theory, task.questions, ...(task.flashcardsRequired ? [task.flashcards] : [])];
  return required.filter(Boolean).length / required.length;
}

function weekCompletion(tasks: WeekTask[]) {
  if (!tasks.length) return 0;
  const totalWeight = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  return totalWeight ? Math.round(tasks.reduce((sum, task) => sum + task.estimatedHours * taskProgress(task), 0) / totalWeight * 100) : 0;
}

function weekStatus(completion: number): WeekPlan["status"] {
  return completion >= 90 ? "Semana cumprida" : completion >= 75 ? "Atenção" : "Atraso semanal relevante";
}

function createTopicTask(topic: MatrixTopic, state: JoaoState, source: TaskSource, order: number, manual = false): WeekTask {
  const progress = state.progress[topic.id] ?? defaultProgress();
  const topicLogs = state.questionLogs.filter(log => log.topicId === topic.id).length;
  const subareaLogs = new Set(state.questionLogs.filter(log => matrixTopics.find(item => item.id === log.topicId)?.subarea === topic.subarea).map(log => log.topicId)).size;
  const questionGoal = topicLogs === 0
    ? `${topic.priority === "P1" ? "20–30" : "15–20"} questões de ${topic.title}`
    : subareaLogs < 2
      ? `25 questões de ${topic.subarea}`
      : `30–40 questões de ${topic.area}`;
  return {
    id: `task-${topic.id}-${Date.now()}-${order}`,
    kind: source === "Faculdade" ? "faculty" : "topic",
    topicId: topic.id,
    title: topic.title,
    area: topic.area,
    subarea: topic.subarea,
    priority: topic.priority,
    source,
    estimatedHours: estimateHours(topic, state.durationHistory),
    theory: progress.theory,
    questions: progress.questions,
    flashcards: progress.flashcards,
    flashcardsRequired: progress.flashcardsRequired,
    questionGoal,
    reviewMode: progress.reviewMode,
    completed: false,
    manual,
    order,
  };
}

function emptyWeek(weekStart: string): WeekPlan {
  return { weekStart, hoursAvailable: 0, facultyTopics: [], obligationType: "Nenhuma", obligationDate: "", obligationNote: "", tasks: [], generated: false, closed: false, completion: 0, status: "Em andamento", balanceDelta: 0 };
}

function matchFacultyTopic(value: string) {
  const key = normalize(value);
  return matrixTopics.find(topic => normalize(topic.title) === key) ?? matrixTopics.find(topic => normalize(topic.title).includes(key) || key.includes(normalize(topic.title)));
}

function isHeavyObligation(week: WeekPlan) {
  if (week.obligationType === "Nenhuma") return false;
  if (!week.obligationDate) return true;
  return daysBetween(week.weekStart, week.obligationDate) <= 10;
}

function generateWeek(state: JoaoState, week: WeekPlan): WeekTask[] {
  if (week.weekStart < JOAO_START_ISO || week.hoursAvailable <= 0) return [];
  const is2028 = week.weekStart >= "2028-01-01";
  const heavy = !is2028 && isHeavyObligation(week);
  let maintenanceReserve = heavy && week.hoursAvailable >= 1 ? 1 : 0;
  let remaining = week.hoursAvailable - maintenanceReserve;
  const tasks: WeekTask[] = [];
  const used = new Set<string>();
  const push = (task: WeekTask) => {
    if (task.estimatedHours > remaining) return false;
    tasks.push({ ...task, order: tasks.length });
    remaining -= task.estimatedHours;
    if (task.topicId) used.add(task.topicId);
    return true;
  };

  if (is2028) {
    const updates = matrixTopics.filter(topic => topic.update2028).slice(0, 2);
    updates.forEach(topic => push({ ...createTopicTask(topic, state, "Residência", tasks.length), id: `update-${topic.id}-${week.weekStart}`, kind: "update", title: `Atualizar diretriz vigente — ${topic.title}`, estimatedHours: 1, completed: false }));
    const weakest = Object.entries(state.progress).filter(([, item]) => (item.accuracy ?? 100) < 75).sort((a, b) => (a[1].accuracy ?? 100) - (b[1].accuracy ?? 100)).slice(0, 3);
    weakest.forEach(([id]) => { const topic = matrixTopics.find(item => item.id === id); if (topic) push({ ...createTopicTask(topic, state, "Residência", tasks.length), id: `weak-${topic.id}-${week.weekStart}`, kind: "review", title: `Revisão dirigida — ${topic.subarea}`, linkedTopicIds: [topic.id], estimatedHours: 1.5, questionGoal: "30–40 questões", completed: false }); });
    if (remaining >= 1) push({ id: `sim-${week.weekStart}`, kind: "simulation", title: "Prova antiga ou simulado completo", area: "Preventiva", subarea: "IAMSPE / SES-PE", priority: "P1", source: "Residência", estimatedHours: Math.min(4, remaining), theory: false, questions: false, flashcards: false, flashcardsRequired: false, questionGoal: "Prova completa em condições reais", reviewMode: "Questões", completed: false, manual: false, order: tasks.length });
    return tasks;
  }

  for (const facultyTitle of week.facultyTopics) {
    const matched = matchFacultyTopic(facultyTitle);
    if (matched && !used.has(matched.id)) {
      push(createTopicTask(matched, state, "Faculdade + Residência", tasks.length));
    } else if (!matched) {
      push({ id: `faculty-${normalize(facultyTitle)}-${week.weekStart}`, kind: "faculty", title: facultyTitle, area: "Clínica Médica", subarea: "Faculdade", priority: heavy ? "P1" : "P2", source: "Faculdade", estimatedHours: heavy ? 2.5 : 1.5, theory: false, questions: true, flashcards: true, flashcardsRequired: false, questionGoal: "Conforme exigência da faculdade", reviewMode: "Manutenção", completed: false, manual: false, order: tasks.length });
    }
  }
  if (maintenanceReserve && tasks.some(task => task.source === "Residência" || task.source === "Faculdade + Residência")) {
    remaining += maintenanceReserve;
    maintenanceReserve = 0;
  }

  const reviewCandidates = Object.entries(state.progress)
    .filter(([, progress]) => progress.theory && progress.reviewStatus !== "Consolidado")
    .sort((a, b) => (a[1].reviewStatus === "Urgente" ? -1 : 1) - (b[1].reviewStatus === "Urgente" ? -1 : 1));
  const grouped = new Map<string, string[]>();
  reviewCandidates.forEach(([id]) => {
    const topic = matrixTopics.find(item => item.id === id);
    if (!topic) return;
    const key = `${topic.area}|${topic.subarea}`;
    grouped.set(key, [...(grouped.get(key) ?? []), id]);
  });
  [...grouped.entries()].slice(0, heavy ? 1 : 2).forEach(([key, ids]) => {
    const [area, subarea] = key.split("|") as [StudyTopic["area"], string];
    const names = ids.slice(0, 3).map(id => matrixTopics.find(topic => topic.id === id)?.title).filter(Boolean);
    push({ id: `review-${normalize(key)}-${week.weekStart}`, kind: "review", title: `Revisão — ${subarea}`, area, subarea, linkedTopicIds: ids, priority: "P1", source: "Residência", estimatedHours: 1.5, theory: false, questions: false, flashcards: false, flashcardsRequired: false, questionGoal: "20–30 questões", reviewMode: "Questões", completed: false, manual: false, order: tasks.length });
    const last = tasks[tasks.length - 1];
    if (last?.id === `review-${normalize(key)}-${week.weekStart}`) last.title += names.length ? ` · priorizar ${names.join(" e ")}` : "";
  });

  const priorIncomplete = Object.values(state.weeks)
    .filter(item => item.weekStart < week.weekStart)
    .flatMap(item => item.tasks)
    .filter(task => task.topicId && taskProgress(task) < 1 && task.priority === "P1")
    .sort((a, b) => a.order - b.order);
  for (const pending of priorIncomplete.slice(0, 2)) {
    if (!pending.topicId || used.has(pending.topicId)) continue;
    const topic = matrixTopics.find(item => item.id === pending.topicId);
    if (topic) push(createTopicTask(topic, state, pending.source === "Faculdade" ? "Faculdade" : "Residência", tasks.length));
  }

  const areaCounts = new Map<StudyTopic["area"], number>(AREAS.map(area => [area, 0]));
  tasks.forEach(task => areaCounts.set(task.area, (areaCounts.get(task.area) ?? 0) + 1));
  const ordered = matrixTopics
    .filter(topic => !(state.progress[topic.id]?.theory && state.progress[topic.id]?.questions))
    .sort((a, b) => ({ P1: 0, P2: 1, P3: 2 }[a.priority] - { P1: 0, P2: 1, P3: 2 }[b.priority]) || b.combinedPriority - a.combinedPriority || a.title.localeCompare(b.title, "pt-BR"));
  while (remaining >= 1.25) {
    const candidate = ordered
      .filter(topic => !used.has(topic.id))
      .sort((a, b) => (areaCounts.get(a.area) ?? 0) - (areaCounts.get(b.area) ?? 0) || ({ P1: 0, P2: 1, P3: 2 }[a.priority] - { P1: 0, P2: 1, P3: 2 }[b.priority]))[0];
    if (!candidate) break;
    const task = createTopicTask(candidate, state, "Residência", tasks.length);
    if (!push(task)) {
      used.add(candidate.id);
      continue;
    }
    areaCounts.set(candidate.area, (areaCounts.get(candidate.area) ?? 0) + 1);
  }

  if (maintenanceReserve && !tasks.some(task => task.source === "Residência" || task.source === "Faculdade + Residência")) {
    remaining += maintenanceReserve;
    const weakest = matrixTopics.find(topic => state.progress[topic.id]?.reviewStatus === "Urgente") ?? matrixTopics.find(topic => topic.priority === "P1");
    if (weakest) push({ ...createTopicTask(weakest, state, "Residência", tasks.length), id: `maintenance-${week.weekStart}`, kind: "maintenance", title: `Manutenção da residência — ${weakest.subarea}`, estimatedHours: 1, theory: true, questionGoal: "15–20 questões ou revisão necessária", completed: false });
  }
  return tasks.sort((a, b) => ({ P1: 0, P2: 1, P3: 2 }[a.priority] - { P1: 0, P2: 1, P3: 2 }[b.priority])).map((task, order) => ({ ...task, order }));
}

function theoreticalCoverage(state: JoaoState) {
  return Math.round(matrixTopics.filter(topic => state.progress[topic.id]?.theory).length / matrixTopics.length * 1000) / 10;
}

function expectedCoverage(dateIso: string) {
  if (dateIso < JOAO_START_ISO) return 0;
  const points: Array<[string, number]> = [[JOAO_START_ISO, 0], ["2026-12-31", 22.5], ["2027-03-31", 40], ["2027-06-30", 60], ["2027-09-30", 82.5], [THEORY_TARGET_ISO, 100]];
  for (let index = 1; index < points.length; index += 1) {
    const [endDate, endValue] = points[index];
    const [startDate, startValue] = points[index - 1];
    if (dateIso <= endDate) {
      const ratio = Math.max(0, Math.min(1, daysBetween(startDate, dateIso) / Math.max(1, daysBetween(startDate, endDate))));
      return startValue + (endValue - startValue) * ratio;
    }
  }
  return 100;
}

function globalStatus(state: JoaoState, today: string) {
  const coverage = theoreticalCoverage(state);
  const expected = expectedCoverage(today);
  const reserveEffect = state.balanceHours / WEEKLY_REFERENCE_HOURS * 1.4;
  const difference = coverage + reserveEffect - expected;
  if (difference >= 4) return { label: "Adiantado", tone: "ahead", explanation: "Cobertura acima da trajetória planejada." };
  if (difference >= -3) return { label: "Em dia", tone: "ontrack", explanation: "Dentro da trajetória até 30/11/2027." };
  if (difference >= -9) return { label: "Atenção", tone: "attention", explanation: "Desvio recuperável nas próximas semanas." };
  return { label: "Atrasado", tone: "late", explanation: "O desvio atual ameaça a conclusão da base." };
}

function recommendationText(progress: TopicProgress) {
  if (progress.reviewMode === "Flashcards") return "Criar/revisar flashcards dos erros deste tema";
  if (progress.reviewMode === "Questões + flashcards") return "Novo bloco de questões + flashcards apenas dos erros de memória";
  if (progress.reviewMode === "Questões") return "Novo bloco fechado de questões, sem consulta";
  return "Manutenção: contato breve e progressão para subárea/grande área";
}

export function JoaoWeeklyWorkspace({ view, profileId, setToast, onSaveStatus }: { view: string; profileId: string; setToast: (message: string) => void; onSaveStatus: (status: "loading" | "saving" | "saved" | "error") => void }) {
  const today = localIso();
  const currentWeekStart = mondayOf(today);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekStart);
  const [state, setState] = useState<JoaoState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncRevision, setSyncRevision] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const load = async () => {
        onSaveStatus("loading");
        const localKey = `gps-joao-weekly-${profileId}`;
        let localData: JoaoState | null = null;
        try { localData = JSON.parse(localStorage.getItem(localKey) ?? "null") as JoaoState | null; } catch { localData = null; }
        const result = await supabase?.from("profile_states").select("data").eq("profile_id", profileId).eq("scope", "joao_weekly_v1").maybeSingle();
        if (cancelled) return;
        const cloudData = result?.data?.data as JoaoState | undefined;
        const parsed = (localData?.revision ?? 0) > (cloudData?.revision ?? 0) ? localData! : cloudData ?? localData ?? emptyState();
        setState({ ...emptyState(), ...parsed, weeks: parsed.weeks ?? {}, progress: parsed.progress ?? {}, questionLogs: parsed.questionLogs ?? [], simulations: parsed.simulations ?? [], durationHistory: { ...emptyState().durationHistory, ...(parsed.durationHistory ?? {}) } });
        setHydrated(true);
        onSaveStatus(result?.error ? "error" : "saved");
        setSyncError(result?.error ? `A nuvem não pôde ser carregada: ${result.error.message}. A cópia deste aparelho foi mantida.` : "");
      };
      load();
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [profileId, onSaveStatus]);

  useEffect(() => {
    if (!hydrated) return;
    const localKey = `gps-joao-weekly-${profileId}`;
    try { localStorage.setItem(localKey, JSON.stringify(state)); }
    catch { queueMicrotask(() => setSyncError("Não foi possível atualizar a cópia deste aparelho. Não feche a página até tentar novamente.")); onSaveStatus("error"); return; }
    if (!supabase) { queueMicrotask(() => setSyncError("A nuvem não está configurada. As alterações continuam preservadas neste aparelho.")); onSaveStatus("error"); return; }
    if (profileId === "joao") { onSaveStatus("saved"); return; }
    onSaveStatus("saving");
    const client = supabase;
    saveQueue.current = saveQueue.current.then(async () => {
      const { error } = await client.from("profile_states").upsert({ profile_id: profileId, scope: "joao_weekly_v1", data: state, updated_at: new Date().toISOString() }, { onConflict: "profile_id,scope" });
      onSaveStatus(error ? "error" : "saved");
      if (error) {
        setSyncError(`Falha na nuvem: ${error.message}. Nada foi perdido: a cópia deste aparelho está atualizada.`);
        setToast("A nuvem não respondeu, mas suas alterações ficaram salvas neste aparelho.");
      } else setSyncError("");
    });
  }, [state, hydrated, profileId, onSaveStatus, setToast, syncRevision]);

  const updateState = useCallback((recipe: (previous: JoaoState) => JoaoState) => setState(previous => {
    const next = recipe(previous);
    return next === previous ? previous : { ...next, version: 2, revision: previous.revision + 1 };
  }), []);
  const coverage = theoreticalCoverage(state);
  const status = globalStatus(state, today);
  const currentWeek = state.weeks[currentWeekStart] ?? emptyWeek(currentWeekStart);

  if (!hydrated) return <section className="joao-loading"><RefreshCw size={24} /><strong>Carregando o motor semanal de João...</strong></section>;

  const common = { state, updateState, setToast, selectedWeek, setSelectedWeek, today };
  let content = <JoaoHome {...common} currentWeek={currentWeek} coverage={coverage} status={status} />;
  if (view === "Meu plano") content = <JoaoWeekPlan {...common} />;
  else if (view === "Plano Mestre") content = <JoaoMasterPlan state={state} coverage={coverage} status={status} today={today} />;
  else if (view === "Mentoria") content = <JoaoMentorship {...common} coverage={coverage} status={status} />;
  else if (view === "Questões") content = <JoaoQuestions {...common} />;
  else if (view === "Flashcards") content = <JoaoFlashcardRecommendations state={state} updateState={updateState} setToast={setToast} />;
  else if (view === "Assuntos") content = <JoaoTopics state={state} updateState={updateState} setToast={setToast} />;
  else if (view === "Prioridades") content = <JoaoPriorities />;
  else if (view === "Desempenho") content = <JoaoPerformance state={state} coverage={coverage} status={status} />;
  else if (view === "Simulados") content = <JoaoSimulations state={state} updateState={updateState} setToast={setToast} today={today} />;
  else if (view === "Revisões") content = <JoaoReviews state={state} updateState={updateState} setToast={setToast} />;
  else if (view === "Bancas e metas") content = <JoaoGoals coverage={coverage} status={status} state={state} />;
  return <>{syncError && <section className="joao-sync-warning"><CloudOff size={19} /><div><strong>Sincronização pendente</strong><span>{syncError}</span></div><button onClick={() => setSyncRevision(value => value + 1)}><RefreshCw size={14} /> Tentar novamente</button></section>}{content}</>;
}

type CommonProps = {
  state: JoaoState;
  updateState: (recipe: (previous: JoaoState) => JoaoState) => void;
  setToast: (message: string) => void;
  selectedWeek: string;
  setSelectedWeek: React.Dispatch<React.SetStateAction<string>>;
  today: string;
};

function JoaoHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="joao-page-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div><div className="joao-bank-lock"><ShieldCheck size={18} /><span><strong>IAMSPE 50%</strong><strong>SES-PE 50%</strong></span></div></div>;
}

function JoaoHome({ currentWeek, coverage, status, state, setSelectedWeek }: CommonProps & { currentWeek: WeekPlan; coverage: number; status: ReturnType<typeof globalStatus> }) {
  const completion = weekCompletion(currentWeek.tasks);
  const isPreStart = currentWeek.weekStart < JOAO_START_ISO;
  const completedHours = currentWeek.tasks.reduce((sum, task) => sum + task.estimatedHours * taskProgress(task), 0);
  const nextActions = currentWeek.tasks.filter(task => taskProgress(task) < 1).slice(0, 4);
  return <div className="joao-stack">
    <JoaoHeader eyebrow="GPS SEMANAL · PERFIL JOÃO" title="Sua decisão de estudo desta semana" text="Metas flexíveis dentro dos 7 dias. Nenhuma tarefa vence por não ser feita em um dia específico." />
    {isPreStart ? <section className="joao-prestart"><CalendarClock size={30} /><div><span>SEMANA LIVRE</span><h2>O plano começa em 24/08/2026</h2><p>A semana atual permanece totalmente em branco e não gera atraso. Na próxima semana, informe suas horas, assuntos da faculdade e obrigações acadêmicas.</p></div><button onClick={() => setSelectedWeek(JOAO_START_ISO)}>Preparar próxima semana <ChevronRight size={16} /></button></section> : null}
    <div className="joao-metrics">
      <JoaoMetric label="Base teórica" value={`${coverage}%`} note="meta: 100% até 30/11/2027" />
      <JoaoMetric label="Plano global" value={status.label} note={status.explanation} tone={status.tone} />
      <JoaoMetric label="Saldo do plano" value={`${state.balanceHours >= 0 ? "+" : ""}${state.balanceHours.toFixed(1)}h`} note={`${Math.abs(state.balanceHours / WEEKLY_REFERENCE_HOURS).toFixed(1)} semana de ${state.balanceHours >= 0 ? "reserva" : "déficit"}`} />
      <JoaoMetric label="Semana" value={currentWeek.generated ? `${completion}%` : "Não gerada"} note={currentWeek.generated ? `${completedHours.toFixed(1)}h de ${currentWeek.hoursAvailable}h` : "aguardando entrada semanal"} />
    </div>
    <section className="joao-panel joao-now"><div className="joao-panel-title"><div><span>O QUE FAZER AGORA</span><h2>{nextActions.length ? "Próximas prioridades da semana" : "Nenhuma tarefa pendente"}</h2><p>A ordem é sugerida, mas você pode reorganizar tudo em “Meu plano”.</p></div></div>{nextActions.length ? <div className="joao-action-list">{nextActions.map(task => <article key={task.id}><b className={task.priority.toLowerCase()}>{task.priority}</b><div><span>{task.source} · {task.area}</span><strong>{task.title}</strong><small>{task.estimatedHours}h · {task.questionGoal}</small></div><em>{Math.round(taskProgress(task) * 100)}%</em></article>)}</div> : <div className="joao-empty"><Check size={24} /><strong>{isPreStart ? "A preparação ainda não começou." : "Semana concluída ou ainda não configurada."}</strong></div>}</section>
  </div>;
}

function JoaoMetric({ label, value, note, tone = "" }: { label: string; value: string; note: string; tone?: string }) {
  return <article className={`joao-metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function JoaoWeekPlan(props: CommonProps) {
  const { state, updateState, setToast, selectedWeek, setSelectedWeek, today } = props;
  const week = state.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
  const [hoursDraft, setHoursDraft] = useState(week.hoursAvailable || 14);
  const [facultyDraft, setFacultyDraft] = useState("");
  const [obligationType, setObligationType] = useState<ObligationType>(week.obligationType);
  const [obligationDate, setObligationDate] = useState(week.obligationDate);
  const [obligationNote, setObligationNote] = useState(week.obligationNote);
  const [topicDraft, setTopicDraft] = useState("");
  const [editing, setEditing] = useState<WeekTask | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const isPreStart = selectedWeek < JOAO_START_ISO;
  const completion = weekCompletion(week.tasks);
  const plannedHours = week.tasks.reduce((sum, task) => sum + task.estimatedHours, 0);

  function navigateWeek(days: number) {
    const target = addDays(selectedWeek, days);
    const targetWeek = state.weeks[target] ?? emptyWeek(target);
    setHoursDraft(targetWeek.hoursAvailable || 14);
    setObligationType(targetWeek.obligationType);
    setObligationDate(targetWeek.obligationDate);
    setObligationNote(targetWeek.obligationNote);
    setFacultyDraft("");
    setTopicDraft("");
    setEditing(null);
    setSelectedWeek(target);
  }

  function saveSetupAndGenerate() {
    if (isPreStart) return setToast("Esta semana ficará em branco. O planejamento começa em 24/08/2026.");
    if (hoursDraft <= 0) return setToast("Informe quantas horas estão disponíveis nesta semana.");
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      const configured = { ...base, hoursAvailable: hoursDraft, obligationType, obligationDate, obligationNote };
      const tasks = generateWeek(previous, configured);
      return { ...previous, weeks: { ...previous.weeks, [selectedWeek]: { ...configured, tasks, generated: true, closed: false, completion: weekCompletion(tasks), status: "Em andamento" } } };
    });
    setToast("Semana recalculada dentro do limite de horas, preservando pendências prioritárias e revisões necessárias.");
  }

  function addFacultyTopic() {
    const value = facultyDraft.trim();
    if (!value) return;
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      if (base.facultyTopics.some(item => normalize(item) === normalize(value))) return previous;
      return { ...previous, weeks: { ...previous.weeks, [selectedWeek]: { ...base, facultyTopics: [...base.facultyTopics, value] } } };
    });
    setFacultyDraft("");
  }

  function removeFacultyTopic(value: string) {
    const matched = matchFacultyTopic(value);
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      const tasks = base.tasks.flatMap(task => {
        if (task.source === "Faculdade" && normalize(task.title) === normalize(value)) return [];
        if (matched && task.source === "Faculdade + Residência" && task.topicId === matched.id) return [{ ...task, source: "Residência" as const }];
        return [task];
      }).map((task, order) => ({ ...task, order }));
      return { ...previous, weeks: { ...previous.weeks, [selectedWeek]: { ...base, facultyTopics: base.facultyTopics.filter(item => item !== value), tasks, completion: weekCompletion(tasks) } } };
    });
    setToast("Assunto da faculdade removido e vínculos da semana recalculados.");
  }

  function renameFacultyTopic(value: string) {
    const renamed = window.prompt("Corrija o assunto da faculdade:", value)?.trim();
    if (!renamed || renamed === value) return;
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      const tasks = base.tasks.map(task => task.source === "Faculdade" && normalize(task.title) === normalize(value) ? { ...task, title: renamed } : task);
      return { ...previous, weeks: { ...previous.weeks, [selectedWeek]: { ...base, facultyTopics: base.facultyTopics.map(item => item === value ? renamed : item), tasks, generated: false } } };
    });
    setToast("Assunto corrigido. Recalcule a semana para atualizar a integração com a residência.");
  }

  function clearWeek() {
    if (!window.confirm(`Excluir todo o planejamento de ${humanWeek(selectedWeek)}? O progresso geral dos assuntos será preservado.`)) return;
    updateState(previous => {
      const old = previous.weeks[selectedWeek];
      if (!old) return previous;
      const weeks = { ...previous.weeks };
      delete weeks[selectedWeek];
      return { ...previous, balanceHours: Math.round((previous.balanceHours - old.balanceDelta) * 10) / 10, durationHistory: removeDurationSamples(previous.durationHistory, old.tasks), weeks };
    });
    setHoursDraft(14); setFacultyDraft(""); setObligationType("Nenhuma"); setObligationDate(""); setObligationNote(""); setTopicDraft("");
    setToast("Planejamento semanal excluído. O progresso global foi preservado.");
  }

  function updateTask(taskId: string, updater: (task: WeekTask) => WeekTask) {
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      const tasks = base.tasks.map(task => task.id === taskId ? updater(task) : task);
      return { ...previous, weeks: { ...previous.weeks, [selectedWeek]: { ...base, tasks, completion: weekCompletion(tasks), status: "Em andamento", closed: false } } };
    });
  }

  function learnDuration(taskId: string) {
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      const task = base.tasks.find(item => item.id === taskId);
      if (!task?.topicId || !task.actualHours || task.actualHours <= 0 || task.durationLearned) return previous;
      const topic = matrixTopics.find(item => item.id === task.topicId);
      if (!topic) return previous;
      const values = [...previous.durationHistory[topic.size], task.actualHours].slice(-20);
      const tasks = base.tasks.map(item => item.id === taskId ? { ...item, durationLearned: true } : item);
      return { ...previous, durationHistory: { ...previous.durationHistory, [topic.size]: values }, weeks: { ...previous.weeks, [selectedWeek]: { ...base, tasks } } };
    });
  }

  function togglePart(task: WeekTask, part: "theory" | "questions" | "flashcards" | "completed") {
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      const tasks = base.tasks.map(item => {
        if (item.id !== task.id) return item;
        if (part === "completed") return { ...item, completed: !item.completed };
        return { ...item, [part]: !item[part] };
      });
      const changed = tasks.find(item => item.id === task.id)!;
      let progress = previous.progress;
      if (changed.topicId) {
        const current = progress[changed.topicId] ?? defaultProgress();
        progress = { ...progress, [changed.topicId]: { ...current, theory: changed.theory, questions: changed.questions, flashcards: changed.flashcards, flashcardsRequired: changed.flashcardsRequired, lastContact: localIso() } };
      }
      return { ...previous, progress, weeks: { ...previous.weeks, [selectedWeek]: { ...base, tasks, completion: weekCompletion(tasks), status: "Em andamento", closed: false } } };
    });
  }

  function removeTask(task: WeekTask) {
    if (!window.confirm(`Excluir “${task.title}” desta semana? As revisões vinculadas serão recalculadas sem deixar itens órfãos.`)) return;
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      const tasks = base.tasks.flatMap(item => {
        if (item.id === task.id) return [];
        if (!task.topicId || item.kind !== "review" || !item.linkedTopicIds?.includes(task.topicId)) return [item];
        const linkedTopicIds = item.linkedTopicIds.filter(id => id !== task.topicId);
        return linkedTopicIds.length ? [{ ...item, linkedTopicIds }] : [];
      });
      return { ...previous, durationHistory: removeDurationSamples(previous.durationHistory, [task]), weeks: { ...previous.weeks, [selectedWeek]: { ...base, tasks: tasks.map((item, order) => ({ ...item, order })), completion: weekCompletion(tasks), status: "Em andamento", closed: false } } };
    });
    setToast("Atividade excluída e revisões relacionadas recalculadas.");
  }

  function addTopic() {
    if (isPreStart) return setToast("A semana atual deve permanecer em branco.");
    const matched = matchFacultyTopic(topicDraft);
    if (!matched) return setToast("Escolha um assunto cadastrado na matriz.");
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      if (base.tasks.some(task => task.topicId === matched.id)) return previous;
      const task = createTopicTask(matched, previous, "Residência", base.tasks.length, true);
      const tasks = [...base.tasks, task];
      return { ...previous, weeks: { ...previous.weeks, [selectedWeek]: { ...base, tasks, generated: true, completion: weekCompletion(tasks), closed: false, status: "Em andamento" } } };
    });
    setTopicDraft(""); setToast("Assunto incluído com base teórica, questões iniciais e acompanhamento vinculado.");
  }

  function moveTask(targetId: string) {
    if (!dragged || dragged === targetId) return setDragged(null);
    updateState(previous => {
      const base = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      const sourceIndex = base.tasks.findIndex(task => task.id === dragged);
      const targetIndex = base.tasks.findIndex(task => task.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return previous;
      const tasks = [...base.tasks];
      const [moving] = tasks.splice(sourceIndex, 1);
      tasks.splice(targetIndex, 0, moving);
      return { ...previous, weeks: { ...previous.weeks, [selectedWeek]: { ...base, tasks: tasks.map((task, order) => ({ ...task, order })) } } };
    });
    setDragged(null);
  }

  function saveEdit() {
    if (!editing) return;
    updateTask(editing.id, () => ({ ...editing, estimatedHours: Math.max(.5, editing.estimatedHours) }));
    setEditing(null); setToast("Atividade atualizada sem romper o acompanhamento vinculado.");
  }

  return <div className="joao-stack">
    <JoaoHeader eyebrow="MINHA SEMANA" title="Planejamento semanal inteligente" text="As horas são o limite; as tarefas são o resultado. Você escolhe quando executar cada atividade dentro dos 7 dias." />
    <div className="joao-week-nav"><button onClick={() => navigateWeek(-7)}><ArrowLeft size={16} /> Semana anterior</button><div><span>{selectedWeek === mondayOf(today) ? "SEMANA ATUAL" : selectedWeek === JOAO_START_ISO ? "PRIMEIRA SEMANA" : "SEMANA SELECIONADA"}</span><strong>{humanWeek(selectedWeek)}</strong></div><button onClick={() => navigateWeek(7)}>Próxima semana <ArrowRight size={16} /></button></div>
    {isPreStart ? <section className="joao-prestart compact"><CalendarClock size={28} /><div><span>SEMANA LIVRE</span><h2>Nenhuma atividade programada</h2><p>O perfil João começa em 24/08/2026. Esta semana não recebe tarefas, não gera atraso e não consome saldo.</p></div></section> : <>
      <section className="joao-panel joao-week-setup"><div className="joao-panel-title"><div><span>ENTRADA SEMANAL</span><h2>O que cabe nesta semana?</h2><p>Informe apenas disponibilidade, assuntos da faculdade e eventual obrigação próxima.</p></div><div className="joao-header-actions"><button className="joao-danger" onClick={clearWeek}><Trash2 size={14} /> Excluir semana</button><button className="joao-primary" onClick={saveSetupAndGenerate}><Sparkles size={16} /> {week.generated ? "Recalcular semana" : "Gerar semana"}</button></div></div><div className="joao-setup-grid"><label><span>Horas disponíveis</span><input type="number" min="1" max="100" value={hoursDraft} onChange={event => setHoursDraft(Number(event.target.value))} /><small>Inclui faculdade, residência, questões, revisões e flashcards.</small></label><label><span>Obrigação acadêmica</span><select value={obligationType} onChange={event => setObligationType(event.target.value as ObligationType)}>{(["Nenhuma", "Prova", "Seminário", "Tutoria/PBL/TBL", "Trabalho", "Outra obrigação"] as ObligationType[]).map(item => <option key={item}>{item}</option>)}</select></label><label><span>Data da obrigação</span><input type="date" value={obligationDate} onChange={event => setObligationDate(event.target.value)} disabled={obligationType === "Nenhuma"} /></label><label><span>Observação</span><input value={obligationNote} onChange={event => setObligationNote(event.target.value)} placeholder="Ex.: prova acumulativa" disabled={obligationType === "Nenhuma"} /></label></div><div className="joao-faculty-entry"><div><input value={facultyDraft} onChange={event => setFacultyDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") addFacultyTopic(); }} placeholder="Assunto da faculdade nesta semana" /><button onClick={addFacultyTopic}><Plus size={15} /> Adicionar</button></div>{week.facultyTopics.length ? <div className="joao-chips">{week.facultyTopics.map(item => <span key={item}>{item}<button title="Editar" onClick={() => renameFacultyTopic(item)}><Pencil size={11} /></button><button title="Excluir" onClick={() => removeFacultyTopic(item)}><X size={12} /></button></span>)}</div> : <small>Nenhum assunto da faculdade informado.</small>}</div></section>
      <div className="joao-week-summary"><span><Clock3 size={16} /><b>{plannedHours.toFixed(1)}h</b> planejadas de <b>{week.hoursAvailable}h</b></span><span><Gauge size={16} /><b>{completion}%</b> concluído</span><span><TrendingUp size={16} /><b>{week.tasks.filter(task => task.priority === "P1").length}</b> prioridades P1</span><span><ShieldCheck size={16} />{isHeavyObligation(week) ? "Semana acadêmica pesada: manutenção da residência protegida" : "Carga dinâmica faculdade + residência"}</span></div>
      <section className="joao-panel"><div className="joao-panel-title"><div><span>TAREFAS SELECIONADAS</span><h2>{week.tasks.length ? `${week.tasks.length} blocos flexíveis` : "Aguardando geração"}</h2><p>Arraste para mudar a ordem. Assuntos grandes permanecem como uma única unidade visual.</p></div><div className="joao-add-topic"><input list="joao-topic-list" value={topicDraft} onChange={event => setTopicDraft(event.target.value)} placeholder="Adicionar assunto" /><datalist id="joao-topic-list">{matrixTopics.map(topic => <option value={topic.title} key={topic.id} />)}</datalist><button onClick={addTopic}><Plus size={15} /> Incluir</button></div></div>{week.tasks.length ? <div className="joao-task-list">{week.tasks.map(task => <article className={`joao-week-task ${taskProgress(task) === 1 ? "done" : ""}`} key={task.id} draggable onDragStart={() => setDragged(task.id)} onDragOver={event => event.preventDefault()} onDrop={() => moveTask(task.id)}><GripVertical className="joao-grip" size={18} /><b className={task.priority.toLowerCase()}>{task.priority}</b><div className="joao-task-copy"><span>{task.source} · {task.area} · {task.subarea}</span><strong>{task.title}</strong><small>{task.estimatedHours}h estimadas · {task.questionGoal}</small>{task.kind === "topic" || task.kind === "faculty" ? <div className="joao-checks"><button className={task.theory ? "checked" : ""} onClick={() => togglePart(task, "theory")}><Check size={13} /> Base teórica</button>{task.source !== "Faculdade" && <button className={task.questions ? "checked" : ""} onClick={() => togglePart(task, "questions")}><Check size={13} /> Questões iniciais</button>}{task.flashcardsRequired && <button className={task.flashcards ? "checked" : ""} onClick={() => togglePart(task, "flashcards")}><Check size={13} /> Flashcards dos erros</button>}</div> : <div className="joao-checks"><button className={task.completed ? "checked" : ""} onClick={() => togglePart(task, "completed")}><Check size={13} /> Concluir bloco</button></div>}</div><div className="joao-task-side"><strong>{Math.round(taskProgress(task) * 100)}%</strong><label>Tempo real<input type="number" min="0" step=".5" value={task.actualHours ?? ""} onChange={event => updateTask(task.id, item => ({ ...item, actualHours: Number(event.target.value), durationLearned: false }))} onBlur={() => learnDuration(task.id)} placeholder="h" /></label><div><button onClick={() => setEditing(task)}><Pencil size={14} /> Editar</button><button className="delete" onClick={() => removeTask(task)}><Trash2 size={14} /> Excluir</button></div></div></article>)}</div> : <div className="joao-empty"><Sparkles size={24} /><strong>Configure e gere a semana para receber uma seleção inteligente.</strong></div>}</section>
    </>}
    {editing && <div className="joao-modal-backdrop" onMouseDown={() => setEditing(null)}><div className="joao-modal" onMouseDown={event => event.stopPropagation()}><header><div><span>EDITAR ATIVIDADE</span><h2>{editing.title}</h2></div><button onClick={() => setEditing(null)}><X size={18} /></button></header><label>Título<input value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} /></label><div className="joao-modal-grid"><label>Grande área<select value={editing.area} onChange={event => setEditing({ ...editing, area: event.target.value as StudyTopic["area"] })}>{AREAS.map(item => <option key={item}>{item}</option>)}</select></label><label>Subárea<input value={editing.subarea} onChange={event => setEditing({ ...editing, subarea: event.target.value })} /></label><label>Origem<select value={editing.source} onChange={event => setEditing({ ...editing, source: event.target.value as TaskSource })}><option>Residência</option><option>Faculdade</option><option>Faculdade + Residência</option></select></label><label>Horas estimadas<input type="number" min=".5" step=".5" value={editing.estimatedHours} onChange={event => setEditing({ ...editing, estimatedHours: Number(event.target.value) })} /></label><label>Meta de questões<input value={editing.questionGoal} onChange={event => setEditing({ ...editing, questionGoal: event.target.value })} /></label><label>Prioridade<select value={editing.priority} onChange={event => setEditing({ ...editing, priority: event.target.value as Priority })}><option>P1</option><option>P2</option><option>P3</option></select></label><label>Revisão<select value={editing.reviewMode} onChange={event => setEditing({ ...editing, reviewMode: event.target.value as ReviewMode })}>{["Questões", "Flashcards", "Questões + flashcards", "Manutenção"].map(item => <option key={item}>{item}</option>)}</select></label></div><footer><button onClick={() => setEditing(null)}>Cancelar</button><button className="joao-primary" onClick={saveEdit}><Check size={15} /> Salvar</button></footer></div></div>}
  </div>;
}

function JoaoMasterPlan({ state, coverage, status, today }: { state: JoaoState; coverage: number; status: ReturnType<typeof globalStatus>; today: string }) {
  const byArea = AREAS.map(area => { const topics = matrixTopics.filter(topic => topic.area === area); const done = topics.filter(topic => state.progress[topic.id]?.theory).length; return { area, percent: Math.round(done / topics.length * 100), done, total: topics.length }; });
  const byPriority = (["P1", "P2", "P3"] as Priority[]).map(priority => { const topics = matrixTopics.filter(topic => topic.priority === priority); return { priority, done: topics.filter(topic => state.progress[topic.id]?.theory).length, total: topics.length }; });
  const attention = matrixTopics.filter(topic => state.progress[topic.id]?.reviewStatus === "Urgente");
  const notStudied = matrixTopics.filter(topic => !state.progress[topic.id]?.theory);
  const milestones = [["31/12/2026", "20–25%"], ["31/03/2027", "≈40%"], ["30/06/2027", "≈60%"], ["30/09/2027", "80–85%"], ["30/11/2027", "100%"], ["Dez/2027", "Buffer"]];
  return <div className="joao-stack"><JoaoHeader eyebrow="PLANO MESTRE" title="Trajetória completa até 30/11/2027" text="Visão acumulada da base. Os marcos são referências de trajetória, nunca obrigações semanais rígidas." /><div className="joao-master-hero"><div><span>COBERTURA DA PRIMEIRA BASE</span><strong>{coverage}%</strong><div><i style={{ width: `${coverage}%` }} /></div><small>Esperado hoje: {expectedCoverage(today).toFixed(1)}%</small></div><div className={status.tone}><span>ESTADO GLOBAL</span><strong>{status.label}</strong><p>{status.explanation}</p></div><div><span>SALDO DE AVANÇO</span><strong>{state.balanceHours >= 0 ? "+" : ""}{state.balanceHours.toFixed(1)}h</strong><p>{state.balanceHours >= 0 ? "reserva disponível para semanas pesadas" : "recuperação distribuída em semanas com mais horas"}</p></div></div><section className="joao-panel"><div className="joao-panel-title"><div><span>COBERTURA EQUILIBRADA</span><h2>Progresso por grande área</h2><p>Preventiva participa desde o início, junto às outras quatro áreas.</p></div></div><div className="joao-area-progress">{byArea.map(item => <article key={item.area}><div><strong>{item.area}</strong><span>{item.done}/{item.total}</span></div><div><i style={{ width: `${item.percent}%` }} /></div><b>{item.percent}%</b></article>)}</div></section><div className="joao-two-columns"><section className="joao-panel"><div className="joao-panel-title"><div><span>PRIORIDADES</span><h2>P1, P2 e P3 concluídos</h2></div></div><div className="joao-priority-stats">{byPriority.map(item => <article key={item.priority}><b className={item.priority.toLowerCase()}>{item.priority}</b><strong>{item.done} de {item.total}</strong><span>{Math.round(item.done / item.total * 100)}%</span></article>)}</div></section><section className="joao-panel"><div className="joao-panel-title"><div><span>MARCOS ACUMULADOS</span><h2>Referências da trajetória</h2></div></div><div className="joao-milestones">{milestones.map(([date, value]) => <div key={date}><span>{date}</span><strong>{value}</strong></div>)}</div></section></div><div className="joao-two-columns"><section className="joao-panel"><div className="joao-panel-title"><div><span>EM ATENÇÃO</span><h2>{attention.length} assuntos urgentes</h2></div></div>{attention.length ? <div className="joao-compact-list">{attention.slice(0, 8).map(topic => <span key={topic.id}><b>{topic.priority}</b>{topic.title}<em>{topic.subarea}</em></span>)}</div> : <div className="joao-empty small"><Check size={20} /><strong>Nenhum assunto urgente.</strong></div>}</section><section className="joao-panel"><div className="joao-panel-title"><div><span>AINDA NÃO ESTUDADOS</span><h2>{notStudied.length} assuntos</h2></div></div><div className="joao-compact-list">{notStudied.slice(0, 8).map(topic => <span key={topic.id}><b>{topic.priority}</b>{topic.title}<em>{topic.area}</em></span>)}</div></section></div></div>;
}

function JoaoMentorship({ state, updateState, setToast, selectedWeek, status }: CommonProps & { coverage: number; status: ReturnType<typeof globalStatus> }) {
  const week = state.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
  const completion = weekCompletion(week.tasks);
  const completedHours = week.tasks.reduce((sum, task) => sum + (task.actualHours ?? task.estimatedHours) * taskProgress(task), 0);
  const urgent = matrixTopics.filter(topic => state.progress[topic.id]?.reviewStatus === "Urgente");
  function closeWeek() {
    if (!week.generated) return setToast("Gere a semana antes de fazer o fechamento.");
    const statusLabel = weekStatus(completion);
    const reference = Math.min(week.hoursAvailable, WEEKLY_REFERENCE_HOURS);
    const delta = Math.round((completedHours - reference) * 10) / 10;
    updateState(previous => {
      const old = previous.weeks[selectedWeek] ?? emptyWeek(selectedWeek);
      return { ...previous, balanceHours: Math.round((previous.balanceHours - old.balanceDelta + delta) * 10) / 10, weeks: { ...previous.weeks, [selectedWeek]: { ...old, closed: true, completion, status: statusLabel, balanceDelta: delta } } };
    });
    setToast(`${statusLabel}. O saldo global foi atualizado sem transformar a carga restante em sobrecarga.`);
  }
  const feedback = !week.generated ? "A semana ainda precisa ser configurada." : completion >= 90 ? `Semana cumprida. ${state.balanceHours >= 0 ? "O avanço fortalece sua reserva." : "O resultado reduz o déficit global."}` : state.balanceHours > 0 ? `Você concluiu ${completion}% da meta, mas possui saldo positivo. O plano global permanece ${status.label.toLocaleLowerCase("pt-BR")}.` : `Você concluiu ${completion}% da meta. Pendências P1 serão priorizadas e conteúdo novo de menor retorno será reduzido.`;
  return <div className="joao-stack"><JoaoHeader eyebrow="MENTORIA SEMANAL" title="Fechamento sem culpa e sem acúmulo" text="O atraso é avaliado apenas no fechamento da semana e sempre considera o saldo de avanço do plano global." /><section className={`joao-feedback ${completion >= 90 ? "good" : completion >= 75 ? "warn" : "attention"}`}><BrainCircuit size={28} /><div><span>FEEDBACK DA SEMANA</span><h2>{week.closed ? week.status : `${completion}% da meta concluída`}</h2><p>{feedback}</p></div><button onClick={closeWeek}><ClipboardCheck size={16} /> Fechar semana</button></section><div className="joao-metrics"><JoaoMetric label="Conclusão semanal" value={`${completion}%`} note="≥90 cumprida · 75–89 atenção" /><JoaoMetric label="Horas realizadas" value={`${completedHours.toFixed(1)}h`} note={`de ${week.hoursAvailable}h disponíveis`} /><JoaoMetric label="Saldo atual" value={`${state.balanceHours >= 0 ? "+" : ""}${state.balanceHours.toFixed(1)}h`} note="absorve semanas mais pesadas" /><JoaoMetric label="Plano global" value={status.label} note={status.explanation} tone={status.tone} /></div><section className="joao-panel"><div className="joao-panel-title"><div><span>RECALCULO INTELIGENTE</span><h2>O que acontecerá na próxima semana</h2><p>Nenhuma pendência será simplesmente empilhada.</p></div></div><div className="joao-rules"><span><b>1</b> Pendências P1 entram primeiro, mantendo exatamente o estágio já concluído.</span><span><b>2</b> Conteúdo novo P2/P3 é reduzido antes de retirar revisões necessárias.</span><span><b>3</b> O saldo positivo pode absorver uma semana de menor avanço.</span><span><b>4</b> Em semana acadêmica pesada, pelo menos 1h de manutenção da residência é protegida.</span></div></section><section className="joao-panel"><div className="joao-panel-title"><div><span>REVISÕES URGENTES</span><h2>{urgent.length ? `Priorizar ${urgent.slice(0, 3).map(topic => topic.subarea).filter((item, index, list) => list.indexOf(item) === index).join(" · ")}` : "Nenhuma revisão urgente"}</h2></div></div>{urgent.length ? <div className="joao-compact-list">{urgent.slice(0, 8).map(topic => <span key={topic.id}><b>{topic.priority}</b>{topic.title}<em>{recommendationText(state.progress[topic.id])}</em></span>)}</div> : <div className="joao-empty small"><Check size={20} /><strong>Manutenção regular é suficiente.</strong></div>}</section></div>;
}

function JoaoQuestions({ state, updateState, setToast, today }: CommonProps) {
  const [form, setForm] = useState({ date: today, topicId: "", questions: 20, accuracy: 60, security: 5, questionNeed: 5, flashcardNeed: 5, errorCause: "Não sabia o conteúdo" as ErrorCause, reviewMode: "Automático" as ReviewChoice });
  const [editingId, setEditingId] = useState<string | null>(null);
  const topic = matrixTopics.find(item => item.id === form.topicId);
  const total = state.questionLogs.reduce((sum, log) => sum + log.questions, 0);
  const weighted = total ? Math.round(state.questionLogs.reduce((sum, log) => sum + log.questions * log.accuracy, 0) / total) : 0;
  const derived = deriveReview(form.accuracy, form.security, form.questionNeed, form.flashcardNeed, form.errorCause);
  const selectedReviewMode = form.reviewMode === "Automático" ? derived.mode : form.reviewMode;
  const selectedFlashcards = selectedReviewMode === "Flashcards" || selectedReviewMode === "Questões + flashcards";
  function save() {
    if (!topic) return setToast("Escolha o assunto do bloco de questões.");
    const existingIds = new Set(state.questionLogs.map(item => item.id));
    let sequence = state.questionLogs.length + 1;
    while (existingIds.has(`q-${today}-${sequence}`)) sequence += 1;
    if (!form.date) return setToast("Informe a data do bloco de questões.");
    const log: DetailedQuestionLog = { id: editingId ?? `q-${today}-${sequence}`, topic: topic.title, area: topic.area, ...form, topicId: topic.id, reviewMode: selectedReviewMode };
    updateState(previous => {
      const oldTopicId = editingId ? previous.questionLogs.find(item => item.id === editingId)?.topicId : undefined;
      const questionLogs = editingId ? previous.questionLogs.map(item => item.id === editingId ? log : item) : [log, ...previous.questionLogs];
      const affected = new Set([topic.id, ...(oldTopicId && oldTopicId !== topic.id ? [oldTopicId] : [])]);
      const progress = { ...previous.progress };
      affected.forEach(topicId => { progress[topicId] = recalculateTopicFromLogs(progress[topicId] ?? defaultProgress(), questionLogs, topicId); });
      const weeks = Object.fromEntries(Object.entries(previous.weeks).map(([key, week]) => [key, { ...week, tasks: week.tasks.map(task => task.topicId && affected.has(task.topicId) ? { ...task, questions: progress[task.topicId].questions, flashcardsRequired: progress[task.topicId].flashcardsRequired, reviewMode: progress[task.topicId].reviewMode } : task) }]));
      return { ...previous, questionLogs, progress, weeks };
    });
    setForm({ date: today, topicId: "", questions: 20, accuracy: 60, security: 5, questionNeed: 5, flashcardNeed: 5, errorCause: "Não sabia o conteúdo", reviewMode: "Automático" }); setEditingId(null);
    setToast(`Resultado salvo. Próxima recomendação: ${selectedReviewMode}.`);
  }
  function edit(log: DetailedQuestionLog) { setForm({ date: log.date, topicId: log.topicId, questions: log.questions, accuracy: log.accuracy, security: log.security, questionNeed: log.questionNeed, flashcardNeed: log.flashcardNeed, errorCause: log.errorCause, reviewMode: log.reviewMode }); setEditingId(log.id); }
  function remove(id: string) {
    if (!window.confirm("Excluir este registro de questões e recalcular as recomendações vinculadas?")) return;
    updateState(previous => {
      const removed = previous.questionLogs.find(log => log.id === id);
      if (!removed) return previous;
      const questionLogs = previous.questionLogs.filter(log => log.id !== id);
      const nextProgress = recalculateTopicFromLogs(previous.progress[removed.topicId] ?? defaultProgress(), questionLogs, removed.topicId);
      const progress = { ...previous.progress, [removed.topicId]: nextProgress };
      const weeks = Object.fromEntries(Object.entries(previous.weeks).map(([key, week]) => {
        const tasks = week.tasks.flatMap(task => {
          if (task.topicId === removed.topicId) return [{ ...task, questions: nextProgress.questions, flashcardsRequired: nextProgress.flashcardsRequired, reviewMode: nextProgress.reviewMode }];
          if (task.kind !== "review" || !task.linkedTopicIds?.includes(removed.topicId) || nextProgress.questions) return [task];
          const linkedTopicIds = task.linkedTopicIds.filter(topicId => topicId !== removed.topicId);
          return linkedTopicIds.length ? [{ ...task, linkedTopicIds }] : [];
        }).map((task, order) => ({ ...task, order }));
        return [key, { ...week, tasks, completion: weekCompletion(tasks) }];
      }));
      return { ...previous, questionLogs, progress, weeks };
    });
    if (editingId === id) setEditingId(null);
    setToast("Registro excluído e recomendações vinculadas recalculadas.");
  }
  return <div className="joao-stack"><JoaoHeader eyebrow="QUESTÕES" title="Registro que ensina o GPS" text="Faça o bloco sem consulta, com material fechado, e corrija apenas depois de finalizar. As metas são sempre editáveis." /><div className="joao-metrics"><JoaoMetric label="Questões registradas" value={String(total)} note="tema → subárea → grande área" /><JoaoMetric label="Acerto ponderado" value={total ? `${weighted}%` : "—"} note="considera o volume realizado" /><JoaoMetric label="Recomendação atual" value={selectedReviewMode} note={derived.status === "Urgente" ? "revisão urgente" : derived.status === "Em breve" ? "revisar em breve" : "consolidado"} /></div><div className="joao-two-columns questions"><section className="joao-panel joao-question-form"><div className="joao-panel-title"><div><span>{editingId ? "EDITAR REGISTRO" : "NOVO BLOCO"}</span><h2>Como foi seu desempenho?</h2></div></div><label>Data<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Assunto<select value={form.topicId} onChange={event => setForm({ ...form, topicId: event.target.value })}><option value="">Selecione</option>{matrixTopics.map(item => <option value={item.id} key={item.id}>{item.area} · {item.title}</option>)}</select></label><div className="joao-form-grid"><label>Questões<input type="number" min="1" value={form.questions} onChange={event => setForm({ ...form, questions: Number(event.target.value) })} /></label><label>Acerto (%)<input type="number" min="0" max="100" value={form.accuracy} onChange={event => setForm({ ...form, accuracy: Number(event.target.value) })} /></label><label>Segurança (0–10)<input type="number" min="0" max="10" value={form.security} onChange={event => setForm({ ...form, security: Number(event.target.value) })} /></label><label>Revisar por questões (0–10)<input type="number" min="0" max="10" value={form.questionNeed} onChange={event => setForm({ ...form, questionNeed: Number(event.target.value) })} /></label><label>Revisar por flashcards (0–10)<input type="number" min="0" max="10" value={form.flashcardNeed} onChange={event => setForm({ ...form, flashcardNeed: Number(event.target.value) })} /></label><label>Principal causa<select value={form.errorCause} onChange={event => setForm({ ...form, errorCause: event.target.value as ErrorCause })}>{["Não sabia o conteúdo", "Esqueci informação", "Confundi conceitos", "Erro de raciocínio/conduta", "Desatenção"].map(item => <option key={item}>{item}</option>)}</select></label><label>Modo de revisão<select value={form.reviewMode} onChange={event => setForm({ ...form, reviewMode: event.target.value as ReviewChoice })}>{["Automático", "Questões", "Flashcards", "Questões + flashcards", "Manutenção"].map(item => <option key={item}>{item}</option>)}</select></label></div><div className={`joao-recommendation ${derived.status.toLocaleLowerCase("pt-BR").replace(" ", "-")}`}><BrainCircuit size={20} /><div><strong>{selectedReviewMode}</strong><p>{selectedFlashcards ? "Flashcards indicados somente para os erros de memória." : form.errorCause === "Desatenção" ? "Não será criada revisão ampla nem flashcard desnecessário." : "O próximo bloco será ajustado pelo tipo de dificuldade."}</p></div></div><button className="joao-primary full" onClick={save}><Check size={16} /> {editingId ? "Atualizar registro" : "Salvar e recalcular"}</button></section><section className="joao-panel"><div className="joao-panel-title"><div><span>HISTÓRICO</span><h2>Blocos realizados</h2><p>Editar ou excluir recalcula somente o perfil João.</p></div></div>{state.questionLogs.length ? <div className="joao-question-history">{state.questionLogs.map(log => <article key={log.id}><div className={log.accuracy < 60 ? "low" : log.accuracy < 75 ? "mid" : "high"}><strong>{log.accuracy}%</strong><small>{log.questions} questões</small></div><div><strong>{log.topic}</strong><span>{log.area} · segurança {log.security}/10</span><small>{log.date.split("-").reverse().join("/")} · {log.errorCause} · {log.reviewMode}</small></div><div><button onClick={() => edit(log)}><Pencil size={13} /></button><button onClick={() => remove(log.id)}><Trash2 size={13} /></button></div></article>)}</div> : <div className="joao-empty"><ListChecks size={22} /><strong>Nenhum bloco registrado.</strong></div>}</section></div></div>;
}

function JoaoFlashcardRecommendations({ state, updateState, setToast }: { state: JoaoState; updateState: (recipe: (previous: JoaoState) => JoaoState) => void; setToast: (message: string) => void }) {
  const indicated = matrixTopics.filter(topic => state.progress[topic.id]?.flashcardsRequired && !state.progress[topic.id]?.flashcards);
  function updateIndication(topicId: string, action: "complete" | "remove") {
    updateState(previous => {
      const current = previous.progress[topicId] ?? defaultProgress();
      const progress = { ...previous.progress, [topicId]: { ...current, flashcards: action === "complete", flashcardsRequired: action === "complete", reviewMode: action === "remove" ? (current.questionNeed ?? 0) >= 6 ? "Questões" : "Manutenção" : current.reviewMode } as TopicProgress };
      const weeks = Object.fromEntries(Object.entries(previous.weeks).map(([key, week]) => [key, { ...week, tasks: week.tasks.map(task => task.topicId === topicId ? { ...task, flashcards: action === "complete", flashcardsRequired: action === "complete", reviewMode: progress[topicId].reviewMode } : task) }]));
      return { ...previous, progress, weeks };
    });
    setToast(action === "complete" ? "Flashcards dos erros marcados como concluídos." : "Indicação removida e tarefas vinculadas atualizadas.");
  }
  return <div className="joao-stack"><JoaoHeader eyebrow="FLASHCARDS" title="Indicações a partir dos seus erros" text="O GPS não fornece cartões. Você cria ou revisa na outra plataforma somente quando as questões revelam falha de memória." /><section className="joao-flash-rule"><Layers3 size={28} /><div><h2>Flashcards não são obrigação depois da teoria</h2><p>Esquecimento de critérios, doses, classificações, valores e confusão conceitual podem gerar indicação. Erro de raciocínio prioriza questões; desatenção não cria revisão desnecessária.</p></div></section><section className="joao-panel"><div className="joao-panel-title"><div><span>FILA INDICADA</span><h2>{indicated.length} assuntos precisam de flashcards dos erros</h2></div></div>{indicated.length ? <div className="joao-revision-cards">{indicated.map(topic => <article key={topic.id}><b>{topic.priority}</b><div><span>{topic.area} · {topic.subarea}</span><strong>{topic.title}</strong><p>Criar/revisar flashcards apenas dos erros identificados nas questões.</p></div><em>{state.progress[topic.id]?.reviewStatus}</em><div className="joao-inline-actions"><button onClick={() => updateIndication(topic.id, "complete")}><Check size={13} /> Marcar feito</button><button className="delete" onClick={() => updateIndication(topic.id, "remove")}><Trash2 size={13} /> Remover indicação</button></div></article>)}</div> : <div className="joao-empty"><Check size={24} /><strong>Nenhuma indicação de flashcards no momento.</strong><p>Isso é normal antes dos primeiros blocos de questões.</p></div>}</section></div>;
}

function JoaoTopics({ state, updateState, setToast }: { state: JoaoState; updateState: (recipe: (previous: JoaoState) => JoaoState) => void; setToast: (message: string) => void }) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState<"Todas" | StudyTopic["area"]>("Todas");
  const filtered = matrixTopics.filter(topic => (area === "Todas" || topic.area === area) && (!search.trim() || normalize(topic.title).includes(normalize(search))));
  function toggleTheory(topic: MatrixTopic) { updateState(previous => { const current = previous.progress[topic.id] ?? defaultProgress(); return { ...previous, progress: { ...previous.progress, [topic.id]: { ...current, theory: !current.theory, lastContact: localIso() } } }; }); setToast("Status da base teórica atualizado sem reiniciar outras etapas."); }
  function editTracking(topic: MatrixTopic) {
    const current = state.progress[topic.id] ?? defaultProgress();
    const reviewMode = window.prompt("Modo de revisão: Questões, Flashcards, Questões + flashcards ou Manutenção", current.reviewMode);
    if (reviewMode === null) return;
    if (!["Questões", "Flashcards", "Questões + flashcards", "Manutenção"].includes(reviewMode)) return setToast("Modo de revisão inválido.");
    const reviewStatus = window.prompt("Estado: Urgente, Em breve ou Consolidado", current.reviewStatus);
    if (reviewStatus === null) return;
    if (!["Urgente", "Em breve", "Consolidado"].includes(reviewStatus)) return setToast("Estado de revisão inválido.");
    updateState(previous => {
      const old = previous.progress[topic.id] ?? defaultProgress();
      const next = { ...old, reviewMode: reviewMode as ReviewMode, reviewStatus: reviewStatus as ReviewStatus, flashcardsRequired: reviewMode === "Flashcards" || reviewMode === "Questões + flashcards" };
      const weeks = Object.fromEntries(Object.entries(previous.weeks).map(([key, week]) => [key, { ...week, tasks: week.tasks.map(task => task.topicId === topic.id ? { ...task, reviewMode: next.reviewMode, flashcardsRequired: next.flashcardsRequired } : task) }]));
      return { ...previous, progress: { ...previous.progress, [topic.id]: next }, weeks };
    });
    setToast("Acompanhamento editado e atividades vinculadas atualizadas.");
  }
  function resetTracking(topic: MatrixTopic) {
    if (!window.confirm(`Excluir todo o acompanhamento de “${topic.title}”? Questões registradas e vínculos semanais desse assunto também serão removidos.`)) return;
    updateState(previous => {
      const progress = { ...previous.progress };
      delete progress[topic.id];
      const questionLogs = previous.questionLogs.filter(log => log.topicId !== topic.id);
      const weeks = Object.fromEntries(Object.entries(previous.weeks).map(([key, week]) => {
        const tasks = week.tasks.flatMap(task => {
          if (task.topicId === topic.id) return [];
          if (!task.linkedTopicIds?.includes(topic.id)) return [task];
          const linkedTopicIds = task.linkedTopicIds.filter(id => id !== topic.id);
          return linkedTopicIds.length ? [{ ...task, linkedTopicIds }] : [];
        }).map((task, order) => ({ ...task, order }));
        return [key, { ...week, tasks, completion: weekCompletion(tasks), closed: false, status: "Em andamento" as const }];
      }));
      return { ...previous, progress, questionLogs, weeks };
    });
    setToast("Dados do assunto excluídos sem deixar revisões órfãs.");
  }
  return <div className="joao-stack"><JoaoHeader eyebrow="MATRIZ IAMSPE + SES-PE" title={`${matrixTopics.length} assuntos organizados por retorno`} text="Todos começaram como não estudados. Cada tema permanece uma unidade, mesmo quando exige várias sessões." /><section className="joao-panel"><div className="joao-topic-toolbar"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar assunto, área ou subárea" /><div>{(["Todas", ...AREAS] as const).map(item => <button className={area === item ? "active" : ""} key={item} onClick={() => setArea(item)}>{item}</button>)}</div></div><div className="joao-matrix-head"><span>{filtered.length} assuntos</span><small>IAMSPE 50% + SES-PE 50% · recorrência histórica combinada</small></div><div className="joao-matrix">{filtered.map(topic => { const progress = state.progress[topic.id] ?? defaultProgress(); return <article key={topic.id}><b className={topic.priority.toLowerCase()}>{topic.priority}</b><div><span>{topic.area} · {topic.subarea}</span><strong>{topic.title}</strong><small>{topic.size} · IAMSPE {topic.iamspePriority || "base"} · SES-PE {topic.sesPriority || "base"}{topic.update2028 ? " · atualizar diretriz em 2028" : ""}</small></div><div className="joao-mini-stages"><span className={progress.theory ? "done" : ""}>Teoria</span><span className={progress.questions ? "done" : ""}>Questões</span><span className={progress.flashcardsRequired ? progress.flashcards ? "done" : "needed" : "optional"}>Flashcards</span></div><em className={progress.reviewStatus.toLocaleLowerCase("pt-BR").replace(" ", "-")}>{progress.reviewStatus}</em><div className="joao-matrix-actions"><button onClick={() => toggleTheory(topic)}>{progress.theory ? "Desmarcar teoria" : "Concluir teoria"}</button><button onClick={() => editTracking(topic)}><Pencil size={12} /> Editar</button><button className="delete" onClick={() => resetTracking(topic)}><Trash2 size={12} /> Excluir dados</button></div></article>; })}</div></section></div>;
}

function JoaoPriorities() {
  const p1 = matrixTopics.filter(topic => topic.priority === "P1");
  return <div className="joao-stack"><JoaoHeader eyebrow="PRIORIDADES" title="Matriz combinada 50/50" text="A recorrência histórica de longo prazo orienta P1, P2 e P3; uma única edição nunca determina sozinha o plano." /><div className="joao-bank-pair"><article><span>50%</span><div><strong>IAMSPE</strong><p>Clínica direta, cirurgia prática e preventiva interpretativa.</p></div></article><article><span>50%</span><div><strong>SES-PE</strong><p>Epidemiologia, perioperatório e temas práticos recorrentes.</p></div></article></div><section className="joao-panel"><div className="joao-panel-title"><div><span>P1 · NÚCLEO</span><h2>Maior retorno combinado</h2><p>Alta recorrência e/ou conteúdo fundamental para as duas provas.</p></div></div><div className="joao-priority-grid">{p1.map(topic => <article key={topic.id}><b>P1</b><div><span>{topic.area} · {topic.subarea}</span><strong>{topic.title}</strong><small>peso combinado {topic.combinedPriority.toFixed(1)}</small></div></article>)}</div></section><section className="joao-panel"><div className="joao-rules"><span><b>P1</b> Núcleo de alta recorrência ou fundamento indispensável.</span><span><b>P2</b> Importante e cobrado regularmente.</span><span><b>P3</b> Complementar, incluído sem retirar espaço do núcleo.</span><span><b>5 áreas</b> Clínica, Cirurgia, GO, Pediatria e Preventiva avançam em paralelo.</span></div></section></div>;
}

function JoaoPerformance({ state, coverage, status }: { state: JoaoState; coverage: number; status: ReturnType<typeof globalStatus> }) {
  const total = state.questionLogs.reduce((sum, log) => sum + log.questions, 0);
  const weighted = total ? Math.round(state.questionLogs.reduce((sum, log) => sum + log.questions * log.accuracy, 0) / total) : 0;
  const areas = AREAS.map(area => { const logs = state.questionLogs.filter(log => log.area === area); const questions = logs.reduce((sum, log) => sum + log.questions, 0); const accuracy = questions ? Math.round(logs.reduce((sum, log) => sum + log.questions * log.accuracy, 0) / questions) : null; return { area, questions, accuracy }; });
  const weakest = matrixTopics.filter(topic => state.progress[topic.id]?.accuracy !== undefined).sort((a, b) => (state.progress[a.id].accuracy ?? 100) - (state.progress[b.id].accuracy ?? 100)).slice(0, 10);
  return <div className="joao-stack"><JoaoHeader eyebrow="DESEMPENHO" title="Fraquezas que realmente mudam a rota" text="A prioridade futura combina acerto, tempo sem contato, incidência nas provas, segurança e necessidade subjetiva." /><div className="joao-metrics"><JoaoMetric label="Questões" value={String(total)} note="registradas na plataforma externa" /><JoaoMetric label="Acerto global" value={total ? `${weighted}%` : "—"} note="ponderado pelo volume" /><JoaoMetric label="Base teórica" value={`${coverage}%`} note="trajetória acumulada" /><JoaoMetric label="Plano global" value={status.label} note={status.explanation} tone={status.tone} /></div><section className="joao-panel"><div className="joao-panel-title"><div><span>POR GRANDE ÁREA</span><h2>Desempenho sem revisão indiscriminada</h2><p>A próxima revisão prioriza somente os temas que concentraram erros.</p></div></div><div className="joao-area-performance">{areas.map(item => <article key={item.area}><strong>{item.area}</strong><b>{item.accuracy === null ? "—" : `${item.accuracy}%`}</b><span>{item.questions} questões</span><div><i style={{ width: `${item.accuracy ?? 0}%` }} /></div></article>)}</div></section><section className="joao-panel"><div className="joao-panel-title"><div><span>MAIORES OPORTUNIDADES</span><h2>Temas que receberão prioridade temporária</h2></div></div>{weakest.length ? <div className="joao-compact-list">{weakest.map(topic => <span key={topic.id}><b>{state.progress[topic.id].accuracy}%</b>{topic.title}<em>{recommendationText(state.progress[topic.id])}</em></span>)}</div> : <div className="joao-empty"><Activity size={22} /><strong>Registre questões para o GPS identificar fraquezas.</strong></div>}</section></div>;
}

function JoaoSimulations({ state, updateState, setToast, today }: { state: JoaoState; updateState: (recipe: (previous: JoaoState) => JoaoState) => void; setToast: (message: string) => void; today: string }) {
  const [form, setForm] = useState({ date: today, bank: "IAMSPE" as "IAMSPE" | "SES-PE", questions: 100, accuracy: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  function save() {
    if (!form.date || form.questions <= 0 || form.accuracy < 0 || form.accuracy > 100) return setToast("Confira os dados do simulado.");
    const existingIds = new Set(state.simulations.map(item => item.id));
    let sequence = state.simulations.length + 1;
    while (existingIds.has(`sim-${form.date}-${sequence}`)) sequence += 1;
    const record = { id: editingId ?? `sim-${form.date}-${sequence}`, ...form };
    updateState(previous => ({ ...previous, simulations: editingId ? previous.simulations.map(item => item.id === editingId ? record : item) : [record, ...previous.simulations] }));
    setForm({ date: today, bank: "IAMSPE", questions: 100, accuracy: 0 });
    setEditingId(null);
    setToast(editingId ? "Simulado atualizado." : "Simulado registrado e incorporado ao acompanhamento.");
  }
  function edit(item: SimulationLog) { setForm({ date: item.date, bank: item.bank, questions: item.questions, accuracy: item.accuracy }); setEditingId(item.id); }
  function remove(id: string) {
    if (!window.confirm("Excluir este simulado?")) return;
    updateState(previous => ({ ...previous, simulations: previous.simulations.filter(item => item.id !== id) }));
    if (editingId === id) { setEditingId(null); setForm({ date: today, bank: "IAMSPE", questions: 100, accuracy: 0 }); }
    setToast("Simulado excluído.");
  }
  return <div className="joao-stack"><JoaoHeader eyebrow="SIMULADOS" title="Provas completas no momento certo" text="Até o fim de 2027, a prioridade é construir a base. Em 2028, provas antigas e simulados IAMSPE/SES-PE tornam-se predominantes." /><section className="joao-roadmap"><article><span>2026–2027</span><strong>Base + questões por tema</strong><p>Progressão para subárea e grande área conforme consolidação.</p></article><ChevronRight /><article><span>Dez/2027</span><strong>Buffer e consolidação</strong><p>Resolver pendências sem criar uma nova corrida de conteúdo.</p></article><ChevronRight /><article><span>2028</span><strong>Simulados completos</strong><p>IAMSPE e SES-PE, provas antigas, diretrizes e correção de fraquezas.</p></article></section><div className="joao-two-columns"><section className="joao-panel joao-question-form"><div className="joao-panel-title"><div><span>{editingId ? "EDITAR" : "REGISTRAR"}</span><h2>Resultado de prova completa</h2></div></div><label>Data<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Banca<select value={form.bank} onChange={event => setForm({ ...form, bank: event.target.value as "IAMSPE" | "SES-PE" })}><option>IAMSPE</option><option>SES-PE</option></select></label><div className="joao-form-grid"><label>Questões<input type="number" min="1" value={form.questions} onChange={event => setForm({ ...form, questions: Number(event.target.value) })} /></label><label>Acerto (%)<input type="number" min="0" max="100" value={form.accuracy} onChange={event => setForm({ ...form, accuracy: Number(event.target.value) })} /></label></div><button className="joao-primary full" onClick={save}><Check size={16} /> {editingId ? "Atualizar resultado" : "Salvar resultado"}</button></section><section className="joao-panel"><div className="joao-panel-title"><div><span>HISTÓRICO</span><h2>{state.simulations.length} simulados</h2></div></div>{state.simulations.length ? <div className="joao-sim-list">{state.simulations.map(item => <article key={item.id}><b>{item.accuracy}%</b><div><strong>{item.bank}</strong><span>{item.questions} questões · {item.date.split("-").reverse().join("/")}</span></div><div className="joao-inline-actions"><button onClick={() => edit(item)}><Pencil size={13} /> Editar</button><button className="delete" onClick={() => remove(item.id)}><Trash2 size={13} /> Excluir</button></div></article>)}</div> : <div className="joao-empty"><ClipboardCheck size={22} /><strong>Nenhum simulado registrado.</strong></div>}</section></div></div>;
}

function JoaoReviews({ state, updateState, setToast }: { state: JoaoState; updateState: (recipe: (previous: JoaoState) => JoaoState) => void; setToast: (message: string) => void }) {
  const groups = new Map<string, MatrixTopic[]>();
  matrixTopics.filter(topic => state.progress[topic.id]?.theory).forEach(topic => { const key = `${topic.area}|${topic.subarea}`; groups.set(key, [...(groups.get(key) ?? []), topic]); });
  const ordered = [...groups.entries()].sort((a, b) => Math.min(...a[1].map(topic => state.progress[topic.id]?.reviewStatus === "Urgente" ? 0 : state.progress[topic.id]?.reviewStatus === "Em breve" ? 1 : 2)) - Math.min(...b[1].map(topic => state.progress[topic.id]?.reviewStatus === "Urgente" ? 0 : state.progress[topic.id]?.reviewStatus === "Em breve" ? 1 : 2)));
  function editGroup(topics: MatrixTopic[]) {
    const currentMode = state.progress[topics[0].id]?.reviewMode ?? "Questões";
    const mode = window.prompt("Modo desta revisão: Questões, Flashcards, Questões + flashcards ou Manutenção", currentMode);
    if (mode === null) return;
    if (!["Questões", "Flashcards", "Questões + flashcards", "Manutenção"].includes(mode)) return setToast("Modo de revisão inválido.");
    const status = window.prompt("Estado desta revisão: Urgente, Em breve ou Consolidado", state.progress[topics[0].id]?.reviewStatus ?? "Em breve");
    if (status === null) return;
    if (!["Urgente", "Em breve", "Consolidado"].includes(status)) return setToast("Estado de revisão inválido.");
    const ids = new Set(topics.map(topic => topic.id));
    updateState(previous => {
      const progress = { ...previous.progress };
      ids.forEach(id => { const current = progress[id] ?? defaultProgress(); progress[id] = { ...current, reviewMode: mode as ReviewMode, reviewStatus: status as ReviewStatus, flashcardsRequired: mode === "Flashcards" || mode === "Questões + flashcards" }; });
      const weeks = Object.fromEntries(Object.entries(previous.weeks).map(([key, week]) => [key, { ...week, tasks: week.tasks.map(task => task.topicId && ids.has(task.topicId) ? { ...task, reviewMode: mode as ReviewMode, flashcardsRequired: mode === "Flashcards" || mode === "Questões + flashcards" } : task) }]));
      return { ...previous, progress, weeks };
    });
    setToast("Revisão editada e sincronizada com os assuntos vinculados.");
  }
  function removeGroup(topics: MatrixTopic[]) {
    if (!window.confirm("Remover esta indicação de revisão? Os registros de questões serão preservados.")) return;
    const ids = new Set(topics.map(topic => topic.id));
    updateState(previous => {
      const progress = { ...previous.progress };
      ids.forEach(id => { const current = progress[id] ?? defaultProgress(); progress[id] = { ...current, reviewMode: "Manutenção", reviewStatus: "Consolidado", flashcardsRequired: false }; });
      const weeks = Object.fromEntries(Object.entries(previous.weeks).map(([key, week]) => [key, { ...week, tasks: week.tasks.filter(task => !(task.kind === "review" && task.linkedTopicIds?.some(id => ids.has(id)))) }]));
      return { ...previous, progress, weeks };
    });
    setToast("Indicação removida sem apagar o histórico de desempenho.");
  }
  return <div className="joao-stack"><JoaoHeader eyebrow="REVISÕES" title="Revisões agrupadas por área" text="A semana não será poluída por dezenas de revisões isoladas. O GPS seleciona internamente os temas com maior necessidade." /><section className="joao-panel">{ordered.length ? <div className="joao-grouped-reviews">{ordered.map(([key, topics]) => { const [area, subarea] = key.split("|"); const urgent = topics.filter(topic => state.progress[topic.id]?.reviewStatus === "Urgente"); const priority = urgent.length ? urgent : topics.filter(topic => state.progress[topic.id]?.reviewStatus === "Em breve"); const modes = [...new Set(priority.map(topic => state.progress[topic.id]?.reviewMode))]; return <article key={key}><header><div><span>{area}</span><h2>Revisão — {subarea}</h2></div><b className={urgent.length ? "urgent" : "soon"}>{urgent.length ? "Urgente" : "Em breve"}</b></header><p><strong>Priorizar:</strong> {priority.slice(0, 4).map(topic => topic.title).join(" · ") || "manutenção dos temas consolidados"}</p><div><span>Meta sugerida: <b>{urgent.length ? "20–30 questões" : "15–20 questões"}</b></span><span>Modo: <b>{modes.join(" + ") || "Manutenção"}</b></span><span>Tempo: <b>1h30 editável</b></span></div><div className="joao-inline-actions"><button onClick={() => editGroup(topics)}><Pencil size={13} /> Editar</button><button className="delete" onClick={() => removeGroup(topics)}><Trash2 size={13} /> Remover</button></div></article>; })}</div> : <div className="joao-empty"><CalendarClock size={24} /><strong>Nenhuma revisão gerada.</strong><p>As recomendações surgem depois da teoria e dos primeiros blocos de questões.</p></div>}</section></div>;
}

function JoaoGoals({ coverage, status, state }: { coverage: number; status: ReturnType<typeof globalStatus>; state: JoaoState }) {
  return <div className="joao-stack"><JoaoHeader eyebrow="BANCAS E METAS" title="Objetivo fixo do perfil João" text="Os pesos desta rota são exclusivos e não alteram as configurações de nenhum outro perfil." /><div className="joao-bank-pair large"><article><span>50%</span><div><strong>IAMSPE</strong><p>Preparação equilibrada entre as cinco grandes áreas.</p></div></article><article><span>50%</span><div><strong>SES-PE</strong><p>Preparação equilibrada entre as cinco grandes áreas.</p></div></article></div><section className="joao-panel"><div className="joao-goal-timeline"><article><span>24/08/2026</span><strong>Início do plano</strong><p>Primeira entrada semanal por horas e demandas da faculdade.</p></article><article><span>30/11/2027</span><strong>100% da primeira base</strong><p>Hoje: {coverage}% · estado {status.label.toLocaleLowerCase("pt-BR")}.</p></article><article><span>Dezembro/2027</span><strong>Buffer</strong><p>Pendências, consolidação e absorção de variações do calendário.</p></article><article><span>2028</span><strong>Predomínio de prática</strong><p>Questões, revisões, provas antigas, simulados, diretrizes e fraquezas.</p></article></div></section><section className="joao-panel"><div className="joao-rules"><span><b>Organização</b> O site não fornece aulas, questões nem flashcards.</span><span><b>Autonomia</b> As metas são semanais; não existem dias obrigatórios.</span><span><b>Saldo</b> {state.balanceHours >= 0 ? `+${state.balanceHours.toFixed(1)}h de reserva` : `${Math.abs(state.balanceHours).toFixed(1)}h abaixo da referência`}.</span><span><b>Escopo</b> Todas estas regras existem somente no perfil João.</span></div></section></div>;
}
