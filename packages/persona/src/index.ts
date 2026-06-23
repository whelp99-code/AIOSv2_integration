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
  type PersonaRouterConfig,
} from './router/router';

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

// Briefing Engine
export {
  BriefingEngine,
  type DailyBriefing,
  type BriefingSummary,
  type ActionItem,
  type BriefingStats,
} from './briefing/engine';
