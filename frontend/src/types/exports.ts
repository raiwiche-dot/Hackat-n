export type AdversaryType =
    | 'HYBRID'
    | 'INSIDER_THREAT'
    | 'ACTOR_CON_PRESENCIA_INTERNA'
    | string;

export type CampaignSeverity = 'CRITICA' | 'ALTA' | 'MEDIA' | string;

export interface MitreTechnique {
    id: string;
    name: string;
    tactic: string;
    url: string;
}

export interface CampaignIocs {
    sourceIps: string[];
    destinationIps: string[];
    actorTokens: string[];
    accountTokens: string[];
}

export interface EvidenceRef {
    dataset: string;
    referencia: string;
    totalFilas: number | null;
    primerasFilas: unknown[];
}

export interface CampaignItem {
    campaignCode: string;
    adversaryType: AdversaryType;
    severity: CampaignSeverity;
    anomalyScore: number;
    firstSeen: string;
    lastSeen: string;
    summary: string;
    mitreTechniques: MitreTechnique[];
    iocs: CampaignIocs;
    ioas: string[];
    hallazgos: string[];
    evidenceRefs: EvidenceRef[];
}

export interface EscenarioIpeItem {
    descripcion: string;
    campanas: string[];
}

export interface EscenariosIpe {
    masProbable: EscenarioIpeItem;
    masPeligroso: EscenarioIpeItem;
}

export interface MlMetricsSummary {
    variant: 'A_GENERICAS' | 'B_DOMINIO';
    incidentesEnTopN: number | null;
    topN: number | null;
    raw: Record<string, unknown>;
}

export interface HallazgosReglasSummary {
    incidentesDetectadosPorIoa: number | null;
    totalIncidentes: number | null;
    raw: Record<string, unknown>;
}

export interface RankingAnomalyRow {
    rank: number;
    entityToken: string;
    score: number | null;
    isSpecialAccount: boolean;
    extra: Record<string, string>;
}

export interface SigmaRuleItem {
    fileName: string;
    kind: 'IoA' | 'IoC';
    content: string;
}

export interface ExportsBundleData {
    campaigns: CampaignItem[];
    escenariosIpe: EscenariosIpe;
    metricsGenericas: MlMetricsSummary;
    metricsDominio: MlMetricsSummary;
    hallazgosReglas: HallazgosReglasSummary;
    rankingPeriodoA: RankingAnomalyRow[];
    stixBundle: Record<string, unknown> | null;
    sigmaRules: SigmaRuleItem[];
}