const riskyActions = new Set([
  'SEND_EMAIL',
  'SEND_QUOTE',
  'EXTERNAL_SHARE',
  'DELETE',
  'MOVE',
  'COST_ACTION',
  'SEND_MESSAGE',
]);

export function requiresApproval(actions: string[]) {
  return actions.some((action) => riskyActions.has(action));
}

export function approvalReason(actions: string[]) {
  if (actions.includes('SEND_EMAIL') || actions.includes('SEND_MESSAGE')) {
    return '외부 발송은 승인 후 처리해야 합니다.';
  }
  if (actions.includes('SEND_QUOTE')) {
    return '견적 발송은 승인 후 처리해야 합니다.';
  }
  if (actions.includes('EXTERNAL_SHARE')) {
    return '외부 공유는 승인 후 처리해야 합니다.';
  }
  if (actions.includes('DELETE')) {
    return '삭제 작업은 승인 후 처리해야 합니다.';
  }
  if (actions.includes('MOVE')) {
    return '데이터 이동은 승인 후 처리해야 합니다.';
  }
  if (actions.includes('COST_ACTION')) {
    return '비용성 작업은 승인 후 처리해야 합니다.';
  }
  return null;
}

export function assertMailSendAllowed(
  actionType: string,
  approved: boolean,
): { ok: true } | { ok: false; status: 409; message: string } {
  if (process.env.MAIL_SEND_KILL_SWITCH === '1' && actionType === 'SEND_EMAIL' && !approved) {
    return {
      ok: false,
      status: 409,
      message: approvalReason([actionType]) ?? '승인이 필요합니다.',
    };
  }
  return { ok: true };
}
