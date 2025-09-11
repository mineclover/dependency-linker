/**
 * Unit tests for ExportInfo model
 */

import { 
  ExportInfo,
  createExportInfo,
  createDefaultExport,
  createNamedExport,
  createNamespaceExport,
  createReExport,
  isDefaultExport,
  isNamedExport,
  isNamespaceExport,
  groupExportsByType,
  getExportStats,
  isValidExportInfo,
  validateExportNames
} from '../../../src/models/ExportInfo';
import { SourceLocation } from '../../../src/models/SourceLocation';

describe('ExportInfo Model', () => {
  const mockLocation: SourceLocation = {
    line: 1,
    column: 0,
    offset: 0
  };

  describe('ExportInfo interface', () => {
    test('should create valid export info object', () => {
      const exportInfo: ExportInfo = {
        name: 'useState',
        type: 'named',
        isTypeOnly: false,
        location: mockLocation
      };

      expect(exportInfo.name).toBe('useState');
      expect(exportInfo.type).toBe('named');
      expect(exportInfo.isTypeOnly).toBe(false);
      expect(exportInfo.location).toBeDefined();
    });

    test('should create export using helper function', () => {
      const exportInfo = createExportInfo('Component', 'named', mockLocation);
      expect(exportInfo.name).toBe('Component');
      expect(exportInfo.type).toBe('named');
      expect(exportInfo.isTypeOnly).toBe(false);
      expect(exportInfo.location).toEqual(mockLocation);
    });

    test('should support all export types', () => {
      const defaultExport = createDefaultExport('default', mockLocation);
      const namedExport = createNamedExport('useState', mockLocation);
      const namespaceExport = createNamespaceExport('utils', mockLocation);
      const reExport = createReExport('Button', './components', mockLocation);

      expect(defaultExport.type).toBe('default');
      expect(namedExport.type).toBe('named');
      expect(namespaceExport.type).toBe('namespace');
      expect(reExport.type).toBe('re-export');
      expect(reExport.source).toBe('./components');
    });

    test('should handle type-only exports', () => {
      const typeExport = createNamedExport('User', mockLocation, true);
      expect(typeExport.isTypeOnly).toBe(true);
      expect(typeExport.name).toBe('User');
      expect(typeExport.type).toBe('named');
    });

    test('should detect export types correctly', () => {
      const defaultExport = createDefaultExport('default', mockLocation);
      const namedExport = createNamedExport('useState', mockLocation);
      const namespaceExport = createNamespaceExport('utils', mockLocation);

      expect(isDefaultExport(defaultExport)).toBe(true);
      expect(isNamedExport(namedExport)).toBe(true);
      expect(isNamespaceExport(namespaceExport)).toBe(true);
    });

    test('should validate export info objects', () => {
      const valid: ExportInfo = {
        name: 'Component',
        type: 'named',
        isTypeOnly: false,
        location: mockLocation
      };

      expect(isValidExportInfo(valid)).toBe(true);
      expect(isValidExportInfo({ name: '', type: 'named', isTypeOnly: false, location: mockLocation })).toBe(false);
      expect(isValidExportInfo({ name: 'test' })).toBe(false);
    });

    test('should group exports by type', () => {
      const exports: ExportInfo[] = [
        createDefaultExport('default', mockLocation),
        createNamedExport('useState', mockLocation),
        createNamespaceExport('utils', mockLocation),
        createReExport('Button', './components', mockLocation)
      ];

      const grouped = groupExportsByType(exports);
      expect(grouped.default).toHaveLength(1);
      expect(grouped.named).toHaveLength(1);
      expect(grouped.namespace).toHaveLength(1);
      expect(grouped['re-export']).toHaveLength(1);
    });

    test('should generate export statistics', () => {
      const exports: ExportInfo[] = [
        createDefaultExport('default', mockLocation),
        createNamedExport('useState', mockLocation),
        createNamedExport('User', mockLocation, true), // type-only
        createNamespaceExport('utils', mockLocation)
      ];

      const stats = getExportStats(exports);
      expect(stats.total).toBe(4);
      expect(stats.default).toBe(1);
      expect(stats.named).toBe(2);
      expect(stats.namespace).toBe(1);
      expect(stats.typeOnly).toBe(1);
      expect(stats.values).toBe(3);
      expect(stats.uniqueNames).toBe(4);
    });

    test('should validate export names for conflicts', () => {
      const conflictingExports: ExportInfo[] = [
        createNamedExport('Component', mockLocation),
        createDefaultExport('Component', mockLocation) // Same name, different type
      ];

      const errors = validateExportNames(conflictingExports);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Component');
      expect(errors[0]).toContain('conflicting types');
    });
  });
});