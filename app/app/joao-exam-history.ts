import type { StudyTopic } from "./topics";

export const JOAO_EXAM_BANKS = [
  { key: "iamspe", name: "IAMSPE", weight: 0.4, percent: 40, description: "Clínica, cirurgia prática e preventiva interpretativa." },
  { key: "sespe", name: "SES-PE", weight: 0.3, percent: 30, description: "Epidemiologia, perioperatório e condutas recorrentes." },
  { key: "uspsp", name: "USP-SP", weight: 0.3, percent: 30, description: "Raciocínio clínico, imagens, trauma e alta complexidade." },
] as const;

export type JoaoBankKey = typeof JOAO_EXAM_BANKS[number]["key"];
export type JoaoExamName = typeof JOAO_EXAM_BANKS[number]["name"];
export type JoaoExamSource = { year: number; url: string; kind: string };
export type JoaoThemeHistory = {
  key: string;
  label: string;
  topics: string[];
  years: Record<JoaoBankKey, number[]>;
};

/**
 * Cadernos de acesso direto conferidos individualmente na janela 2021–2026.
 * Em 2024, o PDF da seleção principal da SES-PE não respondeu; foi usado o
 * caderno oficial da edição complementar 2024.2, indicado explicitamente.
 */
export const JOAO_EXAM_SOURCES: Record<JoaoBankKey, JoaoExamSource[]> = {
  iamspe: [
    { year: 2026, url: "https://anexos.cdn.selecao.net.br/uploads/301/concursos/200/anexos/9aabca6b-bc83-48de-8623-175ed3964207.pdf", kind: "Caderno oficial · Avança SP" },
    { year: 2025, url: "https://site-medway.s3.sa-east-1.amazonaws.com/wp-content/uploads/sites/5/2026/07/15163545/IAMSPE-2025-Objetiva.pdf", kind: "Caderno identificado · cópia de estudo" },
    { year: 2024, url: "https://site-medway.s3.sa-east-1.amazonaws.com/wp-content/uploads/sites/5/2026/07/15163156/IAMSPE-2024-Objetiva.pdf", kind: "Caderno identificado · cópia de estudo" },
    { year: 2023, url: "https://ujjurqtnpakcjznynead.supabase.co/storage/v1/object/public/uploads/provas/psu/iamspe-2023-oficial-prova.pdf", kind: "Caderno Quadrix · aplicação 2022" },
    { year: 2022, url: "https://ujjurqtnpakcjznynead.supabase.co/storage/v1/object/public/uploads/provas/psu/iamspe-2022-oficial-prova.pdf", kind: "Caderno Quadrix · aplicação 2021" },
    { year: 2021, url: "https://storage.googleapis.com/imgs.medway.com.br/2021/02/95b6373f-prova-residencia-medica-objetiva-gabarito-iamspe-2021.pdf", kind: "Caderno identificado · cópia de estudo" },
  ],
  sespe: [
    { year: 2026, url: "https://www.upenet.com.br/concursos/2026/26_RED_MED/provas-e-gab/PROVAS/GR%2001%20ACESSO.pdf", kind: "Caderno oficial · UPENET/IAUPE" },
    { year: 2025, url: "https://www.upenet.com.br/concursos/25_RED_MED/PROVAS/GR%2001%20ACESSO.pdf", kind: "Caderno oficial · UPENET/IAUPE" },
    { year: 2024, url: "https://www.upenet.com.br/concursos/24_Resid_Med_II/Provas-e-gabaritos/PROVAS/GR%2001%20-%20%C3%81REAS%20B%C3%81SICAS%20COM%20ACESSO%20DIRETO%20%202024%20II.pdf", kind: "Caderno oficial · edição complementar 2024.2" },
    { year: 2023, url: "https://www.upenet.com.br/concursos/23_Resid_Med/Provas_Gab/GR%2001%20AREAS%20BASICAS%20COM%20ACESSO%20DIRETO%202023.pdf", kind: "Caderno oficial · UPENET/IAUPE" },
    { year: 2022, url: "https://www.upenet.com.br/concursos/22_Residencia%20Medica/Prof_Gab/GR%2001%20AREAS%20BASICAS%20COM%20ACESSO%20DIRETO%202022.pdf", kind: "Caderno oficial · UPENET/IAUPE" },
    { year: 2021, url: "https://www.upenet.com.br/concursos/2021/21_Residencia%20Medica/Prof_Gab/GR%2001%20ACESSO%20DIRETO.pdf", kind: "Caderno oficial · UPENET/IAUPE" },
  ],
  uspsp: [
    { year: 2026, url: "https://www.fuvest.br/wp-content/uploads/rm2026-prova-AD1-areasbasicas-acessodireto.pdf", kind: "Caderno oficial · FUVEST · grupo AD1" },
    { year: 2025, url: "https://pt.scribd.com/document/807312180/2024-12-01-Rm2025-Prova-Areasbasicasedeacessodireto-Grupo-a1", kind: "Caderno FUVEST identificado · grupo A1" },
    { year: 2024, url: "https://ujjurqtnpakcjznynead.supabase.co/storage/v1/object/public/uploads/provas/psu/usp-2024-r1-objetiva-prova.pdf", kind: "Caderno FUVEST · grupo A1" },
    { year: 2023, url: "https://cdn.medblog.estrategiaeducacional.com.br/wp-content/uploads/2022/12/rm2023_prova_residencia_A_compressed.pdf", kind: "Caderno FUVEST · prova A" },
    { year: 2022, url: "https://ujjurqtnpakcjznynead.supabase.co/storage/v1/object/public/uploads/provas/psu/usp-2022-r1-objetiva-oscelabs-prova.pdf", kind: "Caderno FMUSP · acesso direto" },
    { year: 2021, url: "https://ujjurqtnpakcjznynead.supabase.co/storage/v1/object/public/uploads/provas/psu/usp-2021-r1-objetiva-oscelabs-prova.pdf", kind: "Caderno FMUSP · acesso direto" },
  ],
};

export const JOAO_SUPPLEMENTARY_EXAM = {
  bank: "sespe" as const,
  year: "2026.2",
  url: "https://www.upenet.com.br/concursos/2026/26_RED_MED_II/provas-e-gab/Provas/GR%2001%20ACESSO%202026.2.pdf",
  kind: "Caderno oficial adicional · aplicado em 26/07/2026",
};

/**
 * Os valores indicam anos em que o marcador textual do eixo apareceu no
 * caderno, não quantidade de questões. Uma mesma questão pode mencionar
 * outros diagnósticos; por isso a ordenação também usa a curadoria por banca.
 */
export const JOAO_THEME_HISTORY: JoaoThemeHistory[] = [
  { key: "diabetes", label: "Diabetes e controle metabólico", topics: ["Diabetes","Diabetes Mellitus na Gravidez"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "hipertensao", label: "Hipertensão arterial sistêmica", topics: ["Hipertensão Arterial Sistêmica"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "cardiaca", label: "Insuficiência cardíaca", topics: ["Insuficiência Cardíaca"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "arritmia", label: "Arritmias e fibrilação atrial", topics: ["Arritmias, Síncope e PCR"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "sepse", label: "Sepse e choque", topics: ["Sepse, Choque Séptico e Outros Tipos de Choque"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "trauma", label: "Trauma e abordagem inicial", topics: ["Abordagem Inicial (xABCDE)","Trauma Abdominal","Trauma Torácico"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "apendicite", label: "Apendicite e abdome agudo", topics: ["Abdome Agudo Inflamatório"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "perioperatorio", label: "Cuidado perioperatório", topics: ["Cuidados Pré-operatórios","Cuidados e Complicações Pós-Operatórias"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "pulmao", label: "Pneumonia e infecções respiratórias", topics: ["Pneumonias e Síndromes Gripais"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "asma", label: "Asma e doenças obstrutivas", topics: ["Distúrbios Obstrutivos"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "hiv", label: "HIV e infecções relacionadas", topics: ["HIV e AIDS no Adulto Não Gestante","Hepatites Virais, HIV/AIDS e Outras Infecções na Gestação"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "tuberculose", label: "Tuberculose", topics: ["Tuberculose"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "renal", label: "Doença e insuficiência renal", topics: ["Insuficiência Renal","Glomerulopatias e Tubulopatias"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "eletrolito", label: "Distúrbios hidroeletrolíticos", topics: ["Distúrbios Hidroeletrolíticos e Acidobásicos"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "prenatal", label: "Pré-natal e seguimento gestacional", topics: ["Pré-Natal"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "parto", label: "Assistência ao parto", topics: ["Assistência ao Parto","Estática Fetal, Pelve e Mecanismo de Parto"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "sangramento", label: "Sangramentos e urgências hemorrágicas", topics: ["Sangramento da Primeira Metade da Gestação","Sangramento da Segunda Metade da Gestação","Hemorragia Digestiva"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "colo", label: "Colo uterino e rastreamento", topics: ["Rastreamento do Câncer de Colo Uterino","Tumores do Colo Uterino"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "mama", label: "Doenças e tumores da mama", topics: ["Doenças Benignas da Mama","Tumores Malignos da Mama"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "vacina", label: "Vacinação e imunizações", topics: ["Imunizações"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "diarreia", label: "Síndromes diarreicas", topics: ["Síndromes Diarreicas e Disabsortivas"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "crescimento", label: "Crescimento e desenvolvimento infantil", topics: ["Crescimento e Desenvolvimento na Infância e Adolescência"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "aps", label: "Atenção primária à saúde", topics: ["Atenção Primária à Saúde"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2024, 2025, 2026] } },
  { key: "sus", label: "Organização e princípios do SUS", topics: ["Aspectos Históricos do SUS","A Evolução do SUS"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2025, 2026] } },
  { key: "coronaria", label: "Síndrome coronariana", topics: ["Síndrome Coronariana e Diagnósticos Diferenciais"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "biliar", label: "Doença biliar e colecistite", topics: ["Afecções Benignas das Vias Biliares"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "tireoide", label: "Tireoide", topics: ["Tireoide"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "pre_eclampsia", label: "Pré-eclâmpsia e hipertensão gestacional", topics: ["Síndromes Hipertensivas da Gestação"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "contracepcao", label: "Contracepção", topics: ["Contracepção"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "neonatal", label: "Recém-nascido e neonatologia", topics: ["Alojamento Conjunto e Testes de Triagem Neonatal","Sala de Parto","Período Neonatal: Doenças Respiratórias","Período Neonatal: Doenças Infecciosas"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "sensibilidade", label: "Testes diagnósticos e sensibilidade", topics: ["Estatística de Testes Diagnósticos"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "notificacao", label: "Notificação e vigilância", topics: ["Notificação","Vigilância em Saúde do Trabalhador"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "anemia", label: "Anemias e hemoglobinopatias", topics: ["Anemias e Hemoglobinopatias"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2023, 2024, 2025, 2026], uspsp: [2021, 2023, 2025, 2026] } },
  { key: "epidemiologia", label: "Epidemiologia e desenhos de estudo", topics: ["Estudos Epidemiológicos: Classificação","Estudos Epidemiológicos: Análise Estatística e Aplicação","Indicadores de Morbimortalidade"], years: { iamspe: [2021, 2022, 2023, 2024, 2025, 2026], sespe: [2021, 2022, 2025, 2026], uspsp: [2022, 2023, 2024, 2025, 2026] } },
  { key: "sifilis", label: "Sífilis e infecções sexualmente transmissíveis", topics: ["Úlceras Genitais","Doença Inflamatória Pélvica e Violência Sexual"], years: { iamspe: [2021, 2022, 2023, 2024, 2025], sespe: [2021, 2022, 2023, 2025], uspsp: [2021, 2022, 2023, 2025, 2026] } },
  { key: "dengue", label: "Dengue e síndromes febris", topics: ["Síndromes Febris","Epidemias, Endemias e Pandemias"], years: { iamspe: [2021, 2023, 2024], sespe: [2021, 2022, 2024, 2025, 2026], uspsp: [2021, 2022, 2023, 2025, 2026] } },
  { key: "etica", label: "Ética médica e bioética", topics: ["Ética Médica, Bioética e Documentação"], years: { iamspe: [2022, 2023, 2024, 2026], sespe: [2021, 2022, 2025, 2026], uspsp: [2022, 2023, 2024, 2026] } },
  { key: "avc", label: "Acidente vascular cerebral", topics: ["AVC"], years: { iamspe: [2021, 2022, 2023, 2024, 2025], sespe: [2026], uspsp: [2021, 2022, 2023, 2025] } },
  { key: "nutricao", label: "Nutrição na pediatria", topics: ["Nutrição na Pediatria","Distúrbios Carenciais"], years: { iamspe: [2023], sespe: [], uspsp: [] } },
];

const normalizeTopic = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");

export function joaoThemeHistory(topic: Pick<StudyTopic, "title">) {
  const title = normalizeTopic(topic.title);
  return JOAO_THEME_HISTORY.find(history =>
    history.topics.some(candidate => normalizeTopic(candidate) === title),
  );
}
