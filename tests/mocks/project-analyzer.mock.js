/**
 * Mock for project-analyzer module
 */
module.exports = {
  analyzeProject: jest.fn().mockImplementation(async (projectPath, options) => {
    return {
      detectedType: 'WEB',
      languages: [
        { name: 'JavaScript', percentage: 60, files: 3 },
        { name: 'TypeScript', percentage: 40, files: 2 }
      ],
      frameworks: ['React', 'Express'],
      buildTools: ['npm', 'webpack'],
      detectedComponents: [
        {
          name: 'components',
          path: `${projectPath}/src/components`,
          type: 'directory',
          relationships: []
        }
      ],
      existingDocumentation: [
        {
          path: 'README.md',
          type: 'README',
          lastModified: new Date().toISOString(),
          schemaCompliant: false
        }
      ],
      repositoryInfo: {
        type: 'git',
        branch: 'main'
      }
    };
  }),
  detectLanguages: jest.fn().mockResolvedValue([
    { name: 'JavaScript', percentage: 60, files: 3 },
    { name: 'TypeScript', percentage: 40, files: 2 }
  ]),
  findExistingDocumentation: jest.fn().mockResolvedValue([
    {
      path: 'README.md',
      type: 'README',
      lastModified: new Date().toISOString(),
      schemaCompliant: false
    }
  ]),
  detectFrameworks: jest.fn().mockResolvedValue(['React', 'Express']),
  extractComponents: jest.fn().mockResolvedValue([
    {
      name: 'components',
      path: '/project/src/components',
      type: 'directory',
      relationships: []
    }
  ])
};