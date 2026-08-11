export type StudyTopic = {
  id: string;
  area: "Cirurgia" | "Ginecologia e Obstetrícia" | "Clínica Médica" | "Pediatria" | "Preventiva";
  title: string;
};

const byArea: Record<StudyTopic["area"], string[]> = {
  Cirurgia: [
    "Abdome Agudo Inflamatório", "Abdome Agudo Isquêmico", "Abdome Agudo Obstrutivo", "Abdome Agudo Perfurativo",
    "Doença Arterial Periférica", "Cirurgia Cardíaca", "Tumores Cabeça e Pescoço", "Outras Afecções Cirúrgicas de Cabeça e Pescoço",
    "Cirurgia da Obesidade", "Cólon e Reto na Cirurgia", "Tumores do Aparelho Digestivo", "Anestesia",
    "Cuidados e Complicações Pós-Operatórias", "Cuidados Pré-operatórios", "Feridas, Enxertos e Retalhos", "Técnica Operatória",
    "Hérnias", "Tumores de Partes Moles", "Cirurgia Pediátrica", "Cirurgia Torácica", "Tumores Pulmonares e do Mediastino",
    "Aneurismas", "Doenças Venosas", "Estenose de Carótidas", "Tumores Dermatológicos", "Afecções Pancreáticas",
    "Doença Inflamatória Intestinal", "Hemorragia Digestiva", "Síndrome Disfágica", "Síndrome Dispéptica", "Polipose Intestinal",
    "Afecções Benignas das Vias Biliares", "Oftalmologia", "Fraturas Ósseas", "Luxações, Lesões Ligamentares",
    "Ortopedia Pediátrica", "Tendinites, Tenossinovites, Fasceítes e Bursites", "Tumores Ortopédicos", "Abordagem Inicial (xABCDE)",
    "Queimaduras", "Trauma Abdominal", "Trauma Cranioencefálico (TCE)", "Trauma de Face e Pescoço", "Trauma Torácico",
    "Trauma da Coluna Vertebral (TRM)", "Trauma de Membros e Extremidades", "Afecções Urológicas Benignas", "Tumores Urológicos"
  ],
  "Ginecologia e Obstetrícia": [
    "Rastreamento do Câncer de Colo Uterino", "Pré-Natal", "Tumores do Colo Uterino", "Doenças do Corpo Uterino e Endométrio",
    "Diabetes Mellitus na Gravidez", "Síndromes Hipertensivas da Gestação", "Hepatites Virais, HIV/AIDS e Outras Infecções na Gestação",
    "Outras Doenças na Gestação", "Amenorreias e Síndrome dos Ovários Policísticos", "Ciclo Menstrual", "Climatério", "Contracepção",
    "Anatomia Pélvica", "Dor Pélvica Crônica", "Doença Inflamatória Pélvica e Violência Sexual", "Vulvovaginites",
    "Infertilidade Conjugal", "Doenças Benignas da Mama", "Tumores Malignos da Mama", "Medicina Fetal", "Tumores dos Ovários",
    "Assistência ao Parto", "Estática Fetal, Pelve e Mecanismo de Parto", "Rotura Prematura de Membranas Ovulares e Infecção Ovular",
    "Trabalho de Parto Prematuro", "Puerpério", "Sangramento da Primeira Metade da Gestação", "Sangramento da Segunda Metade da Gestação",
    "PALM-COEIN", "Conceitos em Sexualidade", "Disfunções Sexuais", "Sofrimento Fetal", "Úlceras Genitais",
    "Incontinência Urinária e Prolapsos de Órgãos Pélvicos", "Fístulas", "Patologias da Vulva e Vagina", "Morte Materna"
  ],
  "Clínica Médica": [
    "Infecção do Trato Urinário", "Parasitoses", "Arritmias, Síncope e PCR", "Hipertensão Arterial Sistêmica", "Insuficiência Cardíaca",
    "Síndrome Coronariana e Diagnósticos Diferenciais", "Valvopatias e Cardiomiopatias", "Doenças Infectoparasitárias com Acometimento Dermatológico",
    "Farmacodermias e Dermatoses", "Diabetes", "Paratireoides, Suprarrenal e Outras Síndromes Endócrinas", "Síndrome Metabólica e Dislipidemia",
    "Tireoide", "Geriatria e Demências", "Cirrose, Insuficiência Hepática e Complicações", "Hepatites e Doenças do Metabolismo da Bilirrubina",
    "Afecções Benignas das Vias Biliares", "Endocardite e Infecção de Corrente Sanguínea", "HIV e AIDS no Adulto Não Gestante",
    "Infecções do Sistema Nervoso Central", "Pneumonias e Síndromes Gripais", "Síndromes Febris", "Tuberculose", "Infecções Fúngicas",
    "Distúrbios Hidroeletrolíticos e Acidobásicos", "Glomerulopatias e Tubulopatias", "Insuficiência Renal", "AVC", "Cefaleias",
    "Síndromes Neurológicas e Fraqueza Muscular", "Tumores do SNC", "Anemias e Hemoglobinopatias",
    "Distúrbios da Hemostasia, Desordens Trombóticas e Transfusão de Hemocomponentes", "Onco-Hematologia", "Vertigens",
    "Distúrbios Obstrutivos", "Embolia Pulmonar e Hipertensão Pulmonar", "Doenças Pulmonares Intersticiais",
    "Abuso de Álcool, Tabaco e Outras Substâncias", "Transtornos Mentais", "Artrites e Diagnósticos Diferenciais", "Colagenoses e Miopatias",
    "Vasculites", "Pneumointensivismo", "Sepse, Choque Séptico e Outros Tipos de Choque",
    "Intoxicações Exógenas e Acidentes por Animais Peçonhentos", "Tumores Urológicos"
  ],
  Pediatria: [
    "Desordens do Sistema Imune", "Arritmias, Síncope e PCR", "Cardiopatias Congênitas", "Diabetes", "Constipação Intestinal",
    "Parasitoses", "Síndromes Diarreicas e Disabsortivas", "Desordens Genéticas e Erros Inatos do Metabolismo", "Doenças Exantemáticas",
    "Imunizações", "Infecção do Trato Urinário (ITU)", "Pneumonias e Síndromes Gripais", "Síndromes Febris",
    "Glomerulopatias e Tubulopatias", "Alojamento Conjunto e Testes de Triagem Neonatal", "Período Neonatal: Doenças do Metabolismo",
    "Período Neonatal: Doenças Hematológicas", "Período Neonatal: Doenças Infecciosas", "Período Neonatal: Doenças Respiratórias",
    "Período Neonatal: Doenças Neurológicas e Sensoriais", "Sala de Parto", "Epilepsia e Síndromes Convulsivas", "Distúrbios Carenciais",
    "Nutrição na Pediatria", "Anemias e Hemoglobinopatias", "Nariz, Ouvido e Laringe", "Distúrbios Obstrutivos",
    "Avaliação e Transtornos do Comportamento na Infância e Adolescência", "Crescimento e Desenvolvimento na Infância e Adolescência",
    "Vasculites", "Distúrbios Estaturais e Puberais", "Segurança e Violência na Infância", "Sepse, Choque Séptico e Outros Tipos de Choque"
  ],
  Preventiva: [
    "Ética Médica, Bioética e Documentação", "Estudos Epidemiológicos: Análise Estatística e Aplicação",
    "Estudos Epidemiológicos: Classificação", "Perfis e Indicadores Demográficos", "Indicadores de Morbimortalidade", "Níveis de Prevenção",
    "Aspectos Históricos do SUS", "A Evolução do SUS", "Atenção Primária à Saúde", "Estatística de Testes Diagnósticos", "Notificação",
    "Vigilância em Saúde do Trabalhador", "Epidemias, Endemias e Pandemias", "Radiografia: Conceitos Básicos",
    "Tomografia e Ressonância: Conceitos Básicos", "USG: Conceitos Básicos"
  ]
};

export const topicBank: StudyTopic[] = Object.entries(byArea).flatMap(([area, titles]) =>
  titles.map((title, index) => ({ id: `${area}-${index}`, area: area as StudyTopic["area"], title }))
);

export type BankKey = "sespe" | "enare" | "sussp" | "psumg" | "uspsp" | "usprp" | "unicamp" | "unifesp" | "iamspe";

export type BankPriority = {
  key: BankKey;
  name: string;
  short: string;
  style: string;
  sourceLabel: string;
  sourceUrl: string;
  topics: string[];
};

export const bankPriorities: BankPriority[] = [
  {
    key: "sespe", name: "SES-PE", short: "Pernambuco", style: "Epidemiologia, perioperatório e temas práticos recorrentes.",
    sourceLabel: "levantamentos de provas recentes da SES-PE", sourceUrl: "https://www.eumedicoresidente.com.br/post/assuntos-mais-cobrados-residencia-medica-ses-pe",
    topics: ["Indicadores de Morbimortalidade", "Cuidados Pré-operatórios", "Imunizações", "Estudos Epidemiológicos: Classificação", "Abdome Agudo Inflamatório", "Afecções Benignas das Vias Biliares", "Assistência ao Parto", "Sangramento da Primeira Metade da Gestação", "Ética Médica, Bioética e Documentação", "Diabetes"]
  },
  {
    key: "enare", name: "ENARE", short: "Nacional", style: "APS, clínica frequente, urgências e condutas objetivas.",
    sourceLabel: "análises das edições recentes do ENARE", sourceUrl: "https://www.medway.com.br/conteudos/o-que-mais-cai-no-enare-confira-os-assuntos-mais-cobrados/",
    topics: ["Atenção Primária à Saúde", "Insuficiência Cardíaca", "Arritmias, Síncope e PCR", "Abdome Agudo Inflamatório", "Abordagem Inicial (xABCDE)", "Trauma Abdominal", "Imunizações", "Pneumonias e Síndromes Gripais", "Ética Médica, Bioética e Documentação", "Sangramento da Primeira Metade da Gestação"]
  },
  {
    key: "sussp", name: "SUS-SP", short: "São Paulo", style: "Cardiologia, aparelho digestivo, infectologia e obstetrícia.",
    sourceLabel: "análise das seis edições recentes do SUS-SP", sourceUrl: "https://www.medway.com.br/conteudos/confira-os-temas-mais-cobrados-na-prova-de-residencia-medica-do-sus-sp/",
    topics: ["Síndrome Coronariana e Diagnósticos Diferenciais", "Insuficiência Cardíaca", "HIV e AIDS no Adulto Não Gestante", "Geriatria e Demências", "Diabetes", "Tumores do Aparelho Digestivo", "Trauma Abdominal", "Assistência ao Parto", "Amenorreias e Síndrome dos Ovários Policísticos", "PALM-COEIN"]
  },
  {
    key: "psumg", name: "PSU-MG", short: "Minas Gerais", style: "Eletrólitos, cardiologia, vascular, APS e vigilância.",
    sourceLabel: "levantamentos recentes do PSU-MG", sourceUrl: "https://www.medway.com.br/conteudos/o-que-mais-cai-no-psu-mg-confira-os-assuntos-mais-cobrados/",
    topics: ["Distúrbios Hidroeletrolíticos e Acidobásicos", "Síndrome Coronariana e Diagnósticos Diferenciais", "Hipertensão Arterial Sistêmica", "Valvopatias e Cardiomiopatias", "Vasculites", "Doenças Venosas", "Doença Arterial Periférica", "Síndromes Diarreicas e Disabsortivas", "Atenção Primária à Saúde", "Pré-Natal"]
  },
  {
    key: "uspsp", name: "USP-SP", short: "FMUSP", style: "Raciocínio clínico, imagens, trauma e alta complexidade.",
    sourceLabel: "análise de seis anos da USP-SP", sourceUrl: "https://www.medway.com.br/conteudos/confira-os-temas-mais-cobrados-na-prova-de-residencia-medica-da-usp-sp/",
    topics: ["Síndrome Coronariana e Diagnósticos Diferenciais", "Distúrbios Obstrutivos", "Pneumointensivismo", "Farmacodermias e Dermatoses", "HIV e AIDS no Adulto Não Gestante", "Abordagem Inicial (xABCDE)", "Abdome Agudo Inflamatório", "Anestesia", "Imunizações", "Estatística de Testes Diagnósticos"]
  },
  {
    key: "usprp", name: "USP-RP", short: "Ribeirão Preto", style: "Clínica integrada, infectologia, alto risco e saúde coletiva.",
    sourceLabel: "levantamentos recentes da USP-RP", sourceUrl: "https://www.grupomedcof.com.br/blog/usp-rp-temas-quentes-residencia-medica/",
    topics: ["Insuficiência Cardíaca", "Síndrome Coronariana e Diagnósticos Diferenciais", "Pneumonias e Síndromes Gripais", "HIV e AIDS no Adulto Não Gestante", "Abdome Agudo Inflamatório", "Trauma Abdominal", "Síndromes Hipertensivas da Gestação", "Medicina Fetal", "Imunizações", "Atenção Primária à Saúde"]
  },
  {
    key: "unicamp", name: "UNICAMP", short: "Campinas", style: "Interpretação de imagens, trauma, infectologia pediátrica e epidemiologia.",
    sourceLabel: "levantamentos das provas recentes da UNICAMP", sourceUrl: "https://www.medway.com.br/conteudos/confira-os-temas-mais-cobrados-na-prova-de-residencia-medica-da-unicamp/",
    topics: ["Arritmias, Síncope e PCR", "Abordagem Inicial (xABCDE)", "Tumores do Aparelho Digestivo", "Anestesia", "Cirurgia Pediátrica", "Tumores Urológicos", "Imunizações", "Período Neonatal: Doenças Infecciosas", "Estudos Epidemiológicos: Análise Estatística e Aplicação", "Estatística de Testes Diagnósticos"]
  },
  {
    key: "unifesp", name: "UNIFESP", short: "EPM", style: "Cardiologia, terapia intensiva, oncologia, neonatologia e SUS.",
    sourceLabel: "levantamentos das provas recentes da UNIFESP", sourceUrl: "https://www.medway.com.br/conteudos/confira-os-temas-mais-cobrados-na-prova-de-residencia-medica-da-unifesp/",
    topics: ["Insuficiência Cardíaca", "Pneumointensivismo", "Cirrose, Insuficiência Hepática e Complicações", "Onco-Hematologia", "Cirurgia Torácica", "Tumores do Aparelho Digestivo", "PALM-COEIN", "Tumores do Colo Uterino", "Alojamento Conjunto e Testes de Triagem Neonatal", "Estudos Epidemiológicos: Análise Estatística e Aplicação"]
  },
  {
    key: "iamspe", name: "IAMSPE", short: "Servidor SP", style: "Clínica direta, cirurgia prática e preventiva interpretativa.",
    sourceLabel: "levantamentos recentes do IAMSPE", sourceUrl: "https://www.medway.com.br/conteudos/confira-os-assuntos-que-mais-caem-na-prova-de-residencia-medica-do-iamspe/",
    topics: ["Hipertensão Arterial Sistêmica", "Distúrbios Obstrutivos", "Distúrbios Hidroeletrolíticos e Acidobásicos", "Artrites e Diagnósticos Diferenciais", "Tireoide", "Abdome Agudo Inflamatório", "Cuidados e Complicações Pós-Operatórias", "Imunizações", "Aspectos Históricos do SUS", "Vigilância em Saúde do Trabalhador"]
  }
];

const curatedCards = [
  { topic: "Abdome Agudo Inflamatório", area: "Cirurgia", front: "Qual padrão clássico de dor sugere apendicite aguda?", back: "Dor inicialmente periumbilical ou difusa que migra para a fossa ilíaca direita, geralmente associada a sintomas inflamatórios." },
  { topic: "Abdome Agudo Isquêmico", area: "Cirurgia", front: "Qual achado clínico deve levantar forte suspeita de isquemia mesentérica?", back: "Dor abdominal intensa e desproporcional aos achados iniciais do exame físico." },
  { topic: "Doença Arterial Periférica", area: "Cirurgia", front: "Qual exame simples é usado na avaliação inicial da doença arterial periférica?", back: "O índice tornozelo-braquial, interpretado em conjunto com a clínica e o exame vascular." },
  { topic: "Abordagem Inicial (xABCDE)", area: "Cirurgia", front: "O que o “x” representa no xABCDE do trauma?", back: "Controle imediato de hemorragia externa exsanguinante antes da avaliação das vias aéreas." },
  { topic: "Trauma Torácico", area: "Cirurgia", front: "Quais lesões torácicas devem ser identificadas na avaliação primária?", back: "Lesões com risco imediato, como pneumotórax hipertensivo, hemotórax maciço, pneumotórax aberto e tamponamento cardíaco." },
  { topic: "Pré-Natal", area: "Ginecologia e Obstetrícia", front: "Quais são os objetivos centrais da primeira consulta de pré-natal?", back: "Confirmar e datar a gestação, avaliar riscos, solicitar exames iniciais, revisar vacinas e orientar sinais de alarme e cuidados." },
  { topic: "Síndromes Hipertensivas da Gestação", area: "Ginecologia e Obstetrícia", front: "Pré-eclâmpsia exige obrigatoriamente proteinúria?", back: "Não. Na ausência de proteinúria, pode ser diagnosticada quando a hipertensão se associa a sinais de disfunção de órgão-alvo." },
  { topic: "Contracepção", area: "Ginecologia e Obstetrícia", front: "Por que os critérios de elegibilidade são importantes na contracepção?", back: "Eles relacionam condições clínicas aos riscos e benefícios de cada método, ajudando a escolher uma opção segura e adequada." },
  { topic: "PALM-COEIN", area: "Ginecologia e Obstetrícia", front: "O que o sistema PALM-COEIN organiza?", back: "As causas estruturais e não estruturais do sangramento uterino anormal." },
  { topic: "Insuficiência Cardíaca", area: "Clínica Médica", front: "Quais mecanismos levam aos sintomas de insuficiência cardíaca?", back: "Elevação das pressões de enchimento, congestão e redução do débito cardíaco, com ativação neuro-hormonal compensatória." },
  { topic: "Síndrome Coronariana e Diagnósticos Diferenciais", area: "Clínica Médica", front: "Qual é o primeiro exame para estratificar dor torácica suspeita de síndrome coronariana aguda?", back: "Eletrocardiograma de 12 derivações, obtido e interpretado rapidamente, associado à avaliação clínica e a biomarcadores." },
  { topic: "Distúrbios Hidroeletrolíticos e Acidobásicos", area: "Clínica Médica", front: "Qual é o primeiro passo na interpretação de uma gasometria?", back: "Avaliar o pH para identificar acidemia ou alcalemia e, em seguida, relacionar PaCO₂ e bicarbonato ao distúrbio primário." },
  { topic: "Anemias e Hemoglobinopatias", area: "Clínica Médica", front: "Quais exames laboratoriais sugerem hemólise?", back: "Aumento de reticulócitos, bilirrubina indireta e DHL, com redução da haptoglobina; o contexto clínico define a investigação." },
  { topic: "Sepse, Choque Séptico e Outros Tipos de Choque", area: "Clínica Médica", front: "Qual é a prioridade inicial diante de suspeita de sepse?", back: "Reconhecer disfunção orgânica, obter culturas quando possível sem atrasar o cuidado e iniciar rapidamente suporte e antimicrobianos apropriados." },
  { topic: "Imunizações", area: "Pediatria", front: "O que deve ser verificado antes de considerar uma vacina realmente contraindicada?", back: "Se a condição é uma contraindicação verdadeira ou apenas uma falsa contraindicação, além da idade, histórico vacinal e situação clínica." },
  { topic: "Alojamento Conjunto e Testes de Triagem Neonatal", area: "Pediatria", front: "Qual é a finalidade da triagem neonatal?", back: "Identificar precocemente condições assintomáticas em que o diagnóstico e o tratamento oportunos reduzem morbidade e sequelas." },
  { topic: "Crescimento e Desenvolvimento na Infância e Adolescência", area: "Pediatria", front: "Como o crescimento infantil deve ser avaliado?", back: "Por medidas seriadas em curvas adequadas, considerando trajetória, velocidade de crescimento, contexto familiar e desenvolvimento." },
  { topic: "Estudos Epidemiológicos: Classificação", area: "Preventiva", front: "Qual é a principal diferença entre estudo de coorte e caso-controle?", back: "A coorte parte da exposição e acompanha desfechos; o caso-controle parte do desfecho e investiga exposições anteriores." },
  { topic: "Estatística de Testes Diagnósticos", area: "Preventiva", front: "O que a sensibilidade mede?", back: "A capacidade do teste de identificar como positivos os indivíduos que realmente têm a condição." },
  { topic: "Níveis de Prevenção", area: "Preventiva", front: "O que caracteriza a prevenção quaternária?", back: "Ações para evitar intervenções desnecessárias, sobrediagnóstico e danos associados ao excesso de medicalização." }
] as const;

const activeRecallCards = topicBank.flatMap(topic => [
  {
    topic: topic.title,
    area: topic.area,
    front: `Se ${topic.title} aparecer amanhã na prova, quais cinco pontos você precisa recuperar sem consultar?`,
    back: "Definição e classificação; apresentação típica; diagnóstico e exames-chave; conduta inicial e definitiva; complicações, prevenção ou seguimento. Fale em voz alta e confira seu material-base."
  },
  {
    topic: topic.title,
    area: topic.area,
    front: `Monte uma vinheta clínica de ${topic.title}: qual pista separa o diagnóstico principal do diferencial mais perigoso?`,
    back: "Identifique a pista discriminativa, o exame que muda conduta, a primeira medida segura e o erro clássico de prova. Se não conseguir explicar em 60 segundos, marque como Difícil."
  },
  {
    topic: topic.title,
    area: topic.area,
    front: `Questão de prova sobre ${topic.title}: quais dados mudariam sua conduta imediata e quais seriam apenas distratores?`,
    back: "Separe gravidade e instabilidade, critérios diagnósticos, contraindicações e o próximo passo que altera desfecho. Depois identifique os dados que não modificam a decisão clínica."
  },
  {
    topic: topic.title,
    area: topic.area,
    front: `Em ${topic.title}, qual é a sequência correta entre suspeita, confirmação, primeira conduta e tratamento definitivo?`,
    back: "Responda em quatro etapas: reconhecimento clínico, exame confirmatório quando necessário, estabilização ou medida inicial e tratamento definitivo. Compare com seu material e transforme qualquer falha em um card específico."
  }
]);

const examQuestionTemplates = [
  {
    skill: "Diagnóstico",
    front: (title: string) => `Vinheta de prova sobre ${title}: quais pistas clínicas sustentam o diagnóstico e qual achado obrigaria você a mudar a hipótese?`,
    back: "Responda em três partes: síndrome apresentada, pistas discriminativas e principal diagnóstico alternativo perigoso. Em seguida, diga qual dado clínico ou exame separa as duas hipóteses."
  },
  {
    skill: "Próximo passo",
    front: (title: string) => `Em uma questão sobre ${title}, como decidir entre estabilizar, investigar ou tratar imediatamente?`,
    back: "Primeiro procure instabilidade e sinais de gravidade. Depois identifique se existe diagnóstico clínico suficiente, se um exame realmente muda a conduta e qual intervenção não pode ser atrasada."
  },
  {
    skill: "Conduta",
    front: (title: string) => `A banca confirmou ${title}. Qual é a conduta inicial, o tratamento definitivo e o critério de internação ou encaminhamento?`,
    back: "Organize a resposta em: suporte inicial, tratamento específico, destino do paciente e monitorização. Diferencie a conduta do caso estável daquela exigida por gravidade, complicação ou contraindicação."
  },
  {
    skill: "Armadilha",
    front: (title: string) => `Qual erro de prova é mais provável em ${title}: pedir exame demais, atrasar uma conduta ou escolher tratamento contraindicado?`,
    back: "Revise o ponto de decisão: o que já pode ser concluído pela clínica, qual exame altera manejo, qual medida vem primeiro e quais condições tornam a alternativa aparentemente correta inadequada."
  },
  {
    skill: "Integração",
    front: (title: string) => `Transforme ${title} em uma questão completa: fator de risco, apresentação, exame-chave, conduta e prevenção ou seguimento.`,
    back: "Construa uma cadeia causal curta e coerente. Se algum elo não vier à memória em até 60 segundos, reveja esse trecho no material-base e crie um cartão factual específico para a lacuna."
  }
] as const;

/**
 * Banco autoral unificado em estilo de prova. São 5 ângulos de cobrança para
 * cada um dos 181 assuntos (905 cartões), sem reproduzir questões protegidas.
 */
const broadExamFocusedCards = topicBank.flatMap(topic =>
  examQuestionTemplates.map((template, templateIndex) => ({
    id: `prova-${topic.id}-${templateIndex}`,
    topic: topic.title,
    area: topic.area,
    skill: template.skill,
    front: template.front(topic.title),
    back: template.back,
    examFocused: true as const,
  }))
);

const unifiedPriorityPools = [
  bankPriorities.find(bank => bank.key === "sespe")?.topics ?? [],
  bankPriorities.find(bank => bank.key === "enare")?.topics ?? [],
  bankPriorities.find(bank => bank.key === "iamspe")?.topics ?? [],
];

const examContexts = [
  { label: "ambulatório", cue: "priorize risco, diagnóstico provável e seguimento seguro" },
  { label: "urgência", cue: "priorize gravidade, estabilização e a primeira conduta que muda desfecho" },
  { label: "complicação", cue: "reconheça o sinal de alarme, confirme quando necessário e trate sem atraso" },
  { label: "população especial", cue: "considere idade, gestação, comorbidades e contraindicações" },
] as const;

/**
 * Mais 600 cartões: 10 temas prioritários x 5 habilidades x 4 contextos para
 * cada um dos três sinais de prova solicitados. A origem é usada somente para
 * compor a incidência; na interface todos aparecem no mesmo banco.
 */
const additionalUnifiedExamCards = unifiedPriorityPools.flatMap((topics, poolIndex) =>
  topics.flatMap((title, topicIndex) => {
    const matchedTopic = topicBank.find(topic => topic.title === title) ?? topicBank[(poolIndex * 10 + topicIndex) % topicBank.length];
    return examQuestionTemplates.flatMap((template, templateIndex) =>
      examContexts.map((context, contextIndex) => ({
        id: `prova-prioritaria-${poolIndex}-${topicIndex}-${templateIndex}-${contextIndex}`,
        topic: matchedTopic.title,
        area: matchedTopic.area,
        skill: template.skill,
        front: `Cenário de ${context.label}: ${template.front(matchedTopic.title)}`,
        back: `${template.back} Neste contexto, ${context.cue}.`,
        examFocused: true as const,
      }))
    );
  })
);

export const examFocusedCardDeck = [...broadExamFocusedCards, ...additionalUnifiedExamCards];

export const medicalCardDeck = [...curatedCards, ...activeRecallCards, ...examFocusedCardDeck];
