import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { selectTemplate, TEMPLATES } from '../src/templateSelector.ts';
import type { SlideType } from '../../types/src/index.ts';

describe('TemplateSelector: Registry & Mapping', () => {
  it('should contain exactly the five required templates in TEMPLATES', () => {
    const keys = Object.keys(TEMPLATES).sort();
    assert.deepStrictEqual(keys, ['comparison', 'diagram', 'explainer', 'statement', 'steps']);

    for (const [name, template] of Object.entries(TEMPLATES)) {
      assert.strictEqual(template.name, name);
      assert.strictEqual(typeof template.render, 'function');
    }
  });

  it('should map comparison to the comparison template', () => {
    const template = selectTemplate('comparison');
    assert.strictEqual(template.name, 'comparison');
  });

  it('should map architecture, code, and code_snippet to the diagram template', () => {
    assert.strictEqual(selectTemplate('architecture').name, 'diagram');
    assert.strictEqual(selectTemplate('code').name, 'diagram');
    assert.strictEqual(selectTemplate('code_snippet').name, 'diagram');
  });

  it('should map breakdown to the steps template', () => {
    assert.strictEqual(selectTemplate('breakdown').name, 'steps');
  });

  it('should map hook, takeaway, and cta to the statement template', () => {
    assert.strictEqual(selectTemplate('hook').name, 'statement');
    assert.strictEqual(selectTemplate('takeaway').name, 'statement');
    assert.strictEqual(selectTemplate('cta').name, 'statement');
  });

  it('should map concept and problem to the explainer template', () => {
    assert.strictEqual(selectTemplate('concept').name, 'explainer');
    assert.strictEqual(selectTemplate('problem').name, 'explainer');
  });

  it('should gracefully fallback to the explainer template for unknown slide types', () => {
    assert.strictEqual(selectTemplate('unsupported_custom_type').name, 'explainer');
    assert.strictEqual(selectTemplate('random_name_xyz').name, 'explainer');
    assert.strictEqual(selectTemplate('' as SlideType).name, 'explainer');
  });
});
