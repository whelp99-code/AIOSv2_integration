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

// Briefing Engine
export {
  BriefingEngine,
  type DailyBriefing,
  type BriefingSummary,
  type ActionItem,
  type BriefingStats,
} from './briefing/engine';
