import { describe, expect, it } from 'vitest';
import { PORT_REGISTRY, validatePorts } from '../../packages/config/src/ports';

describe('PORT_REGISTRY', () => {
  it('has no duplicate port assignments', () => {
    const { valid, conflicts } = validatePorts();
    expect(conflicts).toEqual([]);
    expect(valid).toBe(true);
  });

  it('uses canonical integration ports', () => {
    expect(PORT_REGISTRY.AIOS_V2_WEB).toBe(3110);
    expect(PORT_REGISTRY.AIOS_V2_API).toBe(3200);
    expect(PORT_REGISTRY.AIOS_V1).toBe(3101);
    expect(PORT_REGISTRY.F_AIOS_V3).toBe(3201);
    expect(PORT_REGISTRY.SANGFOR_MCP).toBe(3500);
    expect(PORT_REGISTRY.VIBE_CODING_OS).toBe(4000);
    expect(PORT_REGISTRY.MAIL_INTELLIGENCE).toBe(3010);
    expect(PORT_REGISTRY.WHELP99_MCP_BRIDGE).toBe(3600);
    expect(PORT_REGISTRY.WHELP99_OPERATOR_CONSOLE).toBe(3502);
    expect(PORT_REGISTRY.CFO_AI_API).toBe(4100);
  });
});
