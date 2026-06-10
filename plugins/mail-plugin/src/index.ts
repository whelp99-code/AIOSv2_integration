// Mail Plugin - Example plugin for mail intelligence

import type { AIOSPlugin } from '@aios/plugin-core';

export const mailPlugin: AIOSPlugin = {
  id: 'mail-intelligence',
  name: 'Mail Intelligence',
  version: '1.0.0',
  description: 'AI-powered email analysis and management',
  dependencies: ['database', 'llm'],

  async onActivate() {
    console.log('[MailPlugin] Activated');
  },

  async onDeactivate() {
    console.log('[MailPlugin] Deactivated');
  },

  registerRoutes(router: any) {
    // router.get('/api/mail', getMails);
    // router.post('/api/mail/analyze', analyzeMail);
    console.log('[MailPlugin] Routes registered');
  },

  registerServices(container: any) {
    // container.register('mailService', MailService);
    console.log('[MailPlugin] Services registered');
  },

  registerUI(registry: any) {
    // registry.registerPage('/mail', MailPage);
    console.log('[MailPlugin] UI registered');
  }
};

export default mailPlugin;
