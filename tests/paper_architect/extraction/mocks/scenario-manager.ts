/**
 * @ai-scenario-manager
 * @version 1.0
 * @description Manages mock scenarios for AI-driven testing
 */

export type ScenarioContext = {
  name: string;
  params?: Record<string, any>;
  mockState?: Record<string, any>;
};

export class ScenarioManager {
  private static _instance: ScenarioManager;
  private currentScenario: ScenarioContext = { name: 'default' };
  private scenarioRegistry: Map<string, Record<string, any>> = new Map();
  
  /**
   * Get the singleton instance of ScenarioManager
   */
  public static getInstance(): ScenarioManager {
    if (!ScenarioManager._instance) {
      ScenarioManager._instance = new ScenarioManager();
    }
    return ScenarioManager._instance;
  }
  
  /**
   * Register a new scenario with optional fixture data
   */
  public registerScenario(name: string, data: Record<string, any> = {}): void {
    this.scenarioRegistry.set(name, data);
  }
  
  /**
   * Activate a scenario for the current test
   */
  public activateScenario(scenarioName: string, params: Record<string, any> = {}): void {
    if (!this.scenarioRegistry.has(scenarioName)) {
      this.registerScenario(scenarioName);
    }
    
    this.currentScenario = {
      name: scenarioName,
      params,
      mockState: this.scenarioRegistry.get(scenarioName) || {}
    };
  }
  
  /**
   * Get the current active scenario
   */
  public getCurrentScenario(): ScenarioContext {
    return this.currentScenario;
  }
  
  /**
   * Get scenario value for a specific mock and method
   */
  public getScenarioValue<T>(mockName: string, methodName: string, defaultValue?: T): T | undefined {
    if (!this.currentScenario.mockState) return defaultValue;
    
    const mockData = this.currentScenario.mockState[mockName];
    if (!mockData) return defaultValue;
    
    return mockData[methodName] as T ?? defaultValue;
  }
  
  /**
   * Reset the scenario manager to default state
   */
  public reset(): void {
    this.currentScenario = { name: 'default' };
  }
  
  /**
   * Create a scenario-aware mock function
   */
  public createMockFunction<T extends (...args: any[]) => any>(
    mockName: string,
    methodName: string,
    implementations: Record<string, T>,
    defaultImpl: T
  ): jest.Mock {
    return jest.fn().mockImplementation((...args: Parameters<T>) => {
      const scenario = this.getCurrentScenario().name;
      const impl = implementations[scenario] || defaultImpl;
      return impl(...args);
    });
  }
}

// Export a singleton instance
export const scenarioManager = ScenarioManager.getInstance();

/**
 * Decorator for scenario-aware tests
 */
export function withScenario(scenarioName: string, params: Record<string, any> = {}) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      scenarioManager.activateScenario(scenarioName, params);
      try {
        return originalMethod.apply(this, args);
      } finally {
        scenarioManager.reset();
      }
    };
    
    return descriptor;
  };
}

/**
 * Helper function to run a test with a specific scenario
 */
export function runWithScenario<T>(
  scenarioName: string,
  testFn: () => T,
  params: Record<string, any> = {}
): T {
  scenarioManager.activateScenario(scenarioName, params);
  try {
    return testFn();
  } finally {
    scenarioManager.reset();
  }
}