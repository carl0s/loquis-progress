// Initial data, verbatim from progetti_obiettivi.csv and deliverable_scadenze.csv.
// Only used when the database is empty.

type SeedProject = {
  id: string;
  code: string;
  name: string;
  objective: string;
  criteria: string[];
  keywords: string[];
  ongoing: boolean;
};

type SeedDeliverable = {
  projectId: string;
  title: string;
  contents: string;
  startDate?: string;
  dueDate: string;
  contractNote?: string;
};

const BITAGE_NOTE =
  "Il confronto con Bitage deve essere sempre assicurato in termini di confronto delle varie iterazioni all'interno del perimetro del contratto";

export const SEED_PROJECTS: SeedProject[] = [
  {
    id: "ONG",
    code: "0",
    name: "Ottimizzazione continua delle piattaforme digitali attuali",
    objective:
      "Garantire la coerenza di brand identity e la qualità della user experience su loquis.com, loquis.biz, Loquis Studio e le pagine social ufficiali, attraverso un ciclo continuo di analisi, proposta e verifica degli interventi.",
    criteria: [
      "Piano di intervento con priorità condivise",
      "Review periodica delle interfacce e dei materiali pubblicati",
      "Riscontro documentato degli interventi rilasciati in ciascun mese",
    ],
    keywords: ["loquis.com", "loquis studio", "social", "review"],
    ongoing: true,
  },
  {
    id: "A",
    code: "A",
    name: "Nuovo sito Loquis.Biz",
    objective:
      "Supervisionare lo sviluppo UX/UI del nuovo sito loquis.biz, dalla definizione dell'architettura informativa alla messa in produzione, assicurando l'aderenza alle linee guida di brand identity.",
    criteria: [
      "Architettura informativa e user flow approvati",
      "Wireframe e design system delle schermate principali",
      "Validazione UX/UI delle release prima del rilascio",
    ],
    keywords: ["loquis.biz", "biz", "bitage"],
    ongoing: false,
  },
  {
    id: "B",
    code: "B",
    name: "Nuovo sito commerciale Genius Loquis",
    objective:
      "Supervisionare lo sviluppo UX/UI del nuovo sito commerciale Genius Loquis, con particolare attenzione all'efficacia dei percorsi di conversione e alla coerenza con il posizionamento del marchio.",
    criteria: [
      "Architettura informativa e user flow approvati",
      "Wireframe e design system delle schermate principali",
      "Validazione UX/UI delle release prima del rilascio",
    ],
    keywords: ["genius", "commerciale", "bitage"],
    ongoing: false,
  },
  {
    id: "C",
    code: "C",
    name: "Trasferimento interno della brand identity",
    objective:
      "Rendere il team interno della Società autonomo nell'applicazione corretta e coerente delle indicazioni e delle linee guida di brand identity, riducendo progressivamente la necessità di supervisione esterna.",
    criteria: [
      "Linee guida di brand identity in formato utilizzabile dal team",
      "Sessioni di formazione e affiancamento del personale designato",
      "Handover documentato dei materiali sorgente e degli asset",
    ],
    keywords: ["brand", "guidelines", "linee guida", "template", "formazione", "handover"],
    ongoing: false,
  },
];

export const SEED_DELIVERABLES: SeedDeliverable[] = [
  {
    projectId: "A",
    title: "Prima iterazione Architettura informativa e user flow",
    contents: "Mappa del sito, flussi principali approvati",
    dueDate: "2026-08-05",
  },
  {
    projectId: "A",
    title: "Prima iterazione Prototipo navigabile",
    contents: "Prototipo fast-prototyping dei flussi chiave su staging, per validazione con stakeholder",
    dueDate: "2026-08-05",
  },
  {
    projectId: "A",
    title: "Prima iterazione Design system e UI",
    contents: "Token, libreria componenti documentata, schermate principali",
    dueDate: "2026-08-05",
  },
  {
    projectId: "A",
    title: "Prima iterazione Pacchetto handover a Bitage",
    contents: "Design system, specifiche di interazione, asset, accesso al prototipo di riferimento",
    dueDate: "2026-08-05",
  },
  {
    projectId: "A",
    title: "Confronto Bitage e successive iterazioni",
    contents: "Tutte le indicazioni sopra specificate",
    startDate: "2026-08-24",
    dueDate: "2026-09-11",
    contractNote: BITAGE_NOTE,
  },
  {
    projectId: "B",
    title: "Prima iterazione Architettura informativa e user flow",
    contents: "Mappa del sito, flussi principali approvati",
    dueDate: "2026-09-21",
  },
  {
    projectId: "B",
    title: "Prima iterazione Prototipo navigabile",
    contents: "Prototipo fast-prototyping dei flussi chiave su staging, per validazione con stakeholder",
    dueDate: "2026-09-28",
  },
  {
    projectId: "B",
    title: "Prima iterazione Design system e UI",
    contents: "Token, libreria componenti documentata, schermate principali",
    dueDate: "2026-10-05",
  },
  {
    projectId: "B",
    title: "Prima iterazione Pacchetto handover a Bitage",
    contents: "Design system, specifiche di interazione, asset, accesso al prototipo di riferimento",
    dueDate: "2026-10-12",
  },
  {
    projectId: "B",
    title: "Confronto Bitage e successive iterazioni",
    contents: "Tutte le indicazioni sopra specificate",
    startDate: "2026-10-12",
    dueDate: "2026-10-19",
    contractNote: BITAGE_NOTE,
  },
  {
    projectId: "C",
    title: "Ricognizione e consolidamento",
    contents:
      "Inventario dei materiali brand esistenti (logo, palette, tipografia, tone of voice, asset), individuazione di lacune e incoerenze",
    dueDate: "2026-10-19",
  },
  {
    projectId: "C",
    title: "Brand guidelines v1.0",
    contents:
      "Linee guida in formato utilizzabile dal team, basate sul materiale esistente: regole d'uso, esempi corretti/errati, indicazioni di tono per canale",
    dueDate: "2026-10-30",
  },
  {
    projectId: "C",
    title: "Template operativi",
    contents:
      "Master slide per presentazioni aziendali e commerciali, template social e documenti, derivati dalle guidelines v1.0 e modificabili dal team",
    dueDate: "2026-11-15",
  },
  {
    projectId: "C",
    title: "Formazione e handover",
    contents: "3 sessioni di formazione/affiancamento al personale designato + handover documentato di sorgenti e asset",
    dueDate: "2026-11-30",
    contractNote:
      "Criterio di uscita: il team sarà in grado di produrre presentazioni, post e materiali conformi senza supervisione del Professionista",
  },
];
