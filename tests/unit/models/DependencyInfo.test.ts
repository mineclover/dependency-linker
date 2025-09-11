/**
 * Unit tests for DependencyInfo model
 */

import { 
  DependencyInfo, 
  classifyDependencyType, 
  createDependencyInfo, 
  isValidDependencyInfo,
  groupDependenciesByType,
  getDependencyStats
} from '../../../src/models/DependencyInfo';
import { SourceLocation } from '../../../src/models/SourceLocation';

describe('DependencyInfo Model', () => {
  const mockLocation: SourceLocation = {
    line: 1,
    column: 0,
    offset: 0
  };

  describe('classifyDependencyType function', () => {
    test('should classify external dependencies', () => {
      expect(classifyDependencyType('react')).toBe('external');
      expect(classifyDependencyType('lodash')).toBe('external');
      expect(classifyDependencyType('@types/node')).toBe('external');
    });

    test('should classify relative dependencies', () => {
      expect(classifyDependencyType('./utils')).toBe('relative');
      expect(classifyDependencyType('../components/Button')).toBe('relative');
    });

    test('should classify internal dependencies', () => {
      expect(classifyDependencyType('src/services/api')).toBe('internal');
      expect(classifyDependencyType('lib/utils')).toBe('internal');
    });
  });

  describe('DependencyInfo interface', () => {
    test('should create valid dependency info object', () => {
      const dependency: DependencyInfo = {
        source: 'react',
        type: 'external',
        location: mockLocation
      };

      expect(dependency.source).toBe('react');
      expect(dependency.type).toBe('external');
      expect(dependency.location).toBeDefined();
      expect(dependency.location.line).toBe(1);
    });

    test('should create dependency using helper function', () => {
      const dependency = createDependencyInfo('react', mockLocation);
      expect(dependency.source).toBe('react');
      expect(dependency.type).toBe('external');
      expect(dependency.location).toEqual(mockLocation);
    });

    test('should validate dependency info objects', () => {
      const valid: DependencyInfo = {
        source: './utils',
        type: 'relative',
        location: mockLocation
      };

      expect(isValidDependencyInfo(valid)).toBe(true);
      expect(isValidDependencyInfo({ source: '', type: 'external', location: mockLocation })).toBe(false);
      expect(isValidDependencyInfo({ source: 'test' })).toBe(false);
    });

    test('should support all dependency types', () => {
      const external: DependencyInfo = {
        source: 'lodash',
        type: 'external',
        location: mockLocation
      };

      const relative: DependencyInfo = {
        source: './components/Button',
        type: 'relative',
        location: mockLocation
      };

      const internal: DependencyInfo = {
        source: 'src/services/api',
        type: 'internal',
        location: mockLocation
      };

      expect(external.type).toBe('external');
      expect(relative.type).toBe('relative');
      expect(internal.type).toBe('internal');
    });

    test('should group dependencies by type', () => {
      const dependencies: DependencyInfo[] = [
        { source: 'react', type: 'external', location: mockLocation },
        { source: './utils', type: 'relative', location: mockLocation },
        { source: 'src/services', type: 'internal', location: mockLocation }
      ];

      const grouped = groupDependenciesByType(dependencies);
      expect(grouped.external).toHaveLength(1);
      expect(grouped.relative).toHaveLength(1);
      expect(grouped.internal).toHaveLength(1);
    });

    test('should generate dependency statistics', () => {
      const dependencies: DependencyInfo[] = [
        { source: 'react', type: 'external', location: mockLocation },
        { source: './utils', type: 'relative', location: mockLocation },
        { source: 'fs', type: 'external', location: mockLocation }
      ];

      const stats = getDependencyStats(dependencies);
      expect(stats.total).toBe(3);
      expect(stats.external).toBe(2);
      expect(stats.relative).toBe(1);
      expect(stats.internal).toBe(0);
      expect(stats.unique).toBe(3);
    });
  });
});