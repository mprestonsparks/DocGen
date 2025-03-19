/**
 * @ai-test-template
 * @version 1.0
 * @template-type unit-test
 * @description Base template for AI-generated unit tests
 */

/**
 * @ai-test-metadata
 * @version 1.0
 * @target-module {{module_name}}
 * @target-function {{function_name}}
 * @coverage-target {{coverage_targets}}
 * @generation-attempt {{generation_attempt}}
 * @dependency-mocks {{dependency_mocks}}
 * @fixtures {{fixtures}}
 * @evolution-history {{evolution_history}}
 * @decision-path {{decision_path}}
 */

import { {{function_imports}} } from '{{module_path}}';
{{#each mock_imports}}
import { {{this.name}} } from '../mocks/{{this.file}}';
{{/each}}
{{#if has_fixtures}}
import { loadFixture } from '../fixtures/loader';
{{/if}}

describe('{{module_name}} - {{function_name}}', () => {
  // Test configuration
  const testConfig = {
    scenarioName: '{{scenario_name}}',
    coverageTargets: [
      {{#each coverage_target_details}}
      '{{this}}',
      {{/each}}
    ]
  };

  // Mock setup
  {{#each mock_setup}}
  let {{this.variable_name}};
  {{/each}}

  beforeEach(() => {
    // Reset mocks before each test
    {{#each mock_setup}}
    {{this.variable_name}} = {{this.mock_initializer}};
    {{/each}}
  });

  {{#each test_cases}}
  test('@covers-{{this.coverage_type}}:{{this.coverage_id}} - {{this.description}}', () => {
    // Arrange
    {{#if this.has_fixtures}}
    const fixture = loadFixture('{{this.fixture_name}}');
    {{/if}}
    {{this.arrange_code}}

    // Act
    {{this.act_code}}

    // Assert
    {{this.assert_code}}
  });
  {{/each}}
});