// Mail Classifier
export {
  MailClassifier,
  PersonaTypeEnum,
  type PersonaType,
  type ClassificationResult,
  type MailItem,
} from './mail/classifier';

// Persona Router
export {
  PersonaRouter,
  type RoutingMessage,
  type ConsumedRoutingMessage,
  type PersonaRouterConfig,
} from './router/router';

// Action Router
export {
  ActionRouter,
  type ActionItem,
  type ActionResult,
  type ActionStatus,
  type ActionRouterConfig,
} from './router/action-router';

// Work Support Persona
export {
  WorkSupportPersona,
  type WorkSupportResult,
  type BriefingItem,
} from './personas/work-support';

// Sales Persona
export {
  SalesPersona,
  type Customer,
  type Opportunity,
  type Proposal,
  type SalesResult,
} from './personas/sales';

// Finance Persona
export {
  FinancePersona,
  type Invoice,
  type Expense,
  type VATResult,
  type FinanceResult,
} from './personas/finance';

// Presales Persona
export {
  PresalesPersona,
  type TechReview,
  type SolutionDesign,
  type TechResponse,
  type PresalesResult,
} from './personas/presales';

// PM Persona
export {
  PMPersona,
  type Project,
  type Task,
  type ProjectUpdate,
  type PMResult,
} from './personas/pm';

// Engineer Persona
export {
  EngineerPersona,
  type CodeReview,
  type TechTask,
  type SystemBuild,
  type EngineerResult,
} from './personas/engineer';

// Marketing Persona
export {
  MarketingPersona,
  type ContentPlan,
  type Newsletter,
  type BrandAsset,
  type MarketingResult,
} from './personas/marketing';

// Approval Gate
export {
  ApprovalGate,
  type ApprovalRequest,
  type ApprovalStatus,
  type AuditLog,
  type ApprovalPolicy,
  type ApprovalGateResult,
} from './approval/gate';

// Briefing Engine
export {
  BriefingEngine,
  type DailyBriefing,
  type BriefingSummary,
  type BriefingItem as BriefingEngineItem,
  type CEOBriefingItem,
  type PersonaStats,
} from './briefing/engine';
// Voice Command
export {
  VoiceCommandProcessor,
  type VoiceCommand,
  type VoiceIntent,
  type VoiceEntity,
  type VoiceCommandResult,
  type VoiceConfig,
  type STTResult,
  type TTSRequest,
  type TTSResult,
  type ISTTProvider,
  type ITTSProvider,
} from './voice/index';
