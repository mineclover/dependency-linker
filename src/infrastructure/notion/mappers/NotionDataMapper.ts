/**
 * Notion Data Mapper - Pure Data Transformation
 * Converts between domain objects and Notion API formats
 */

export class NotionDataMapper {
  private schemaVersion: string;

  constructor(schemaVersion: string) {
    this.schemaVersion = schemaVersion;
  }

  /**
   * Convert domain schema to Notion schema format
   */
  toNotionSchema(schema: any): any {
    return {
      parent: { page_id: schema.parentPageId },
      title: [{ type: 'text', text: { content: schema.title } }],
      properties: this.convertProperties(schema.properties)
    };
  }

  /**
   * Convert document to Notion page format
   */
  documentToNotionPage(document: any): { properties: any; children: any[] } {
    return {
      properties: {
        'Name': {
          title: [{ type: 'text', text: { content: document.name || 'Untitled' } }]
        }
      },
      children: this.convertContentToBlocks(document.content || '')
    };
  }

  /**
   * Convert legacy file format to ProjectFile
   */
  legacyFileToProjectFile(file: any): any {
    return {
      name: file.relativePath || file.name || 'Untitled',
      path: file.relativePath || file.path || '',
      content: file.content || '',
      size: file.size || 0,
      lastModified: file.lastModified || new Date()
    };
  }

  private convertProperties(properties: any): any {
    // Basic property conversion
    const converted: any = {};
    for (const [key, value] of Object.entries(properties || {})) {
      converted[key] = this.convertProperty(value);
    }
    return converted;
  }

  private convertProperty(property: any): any {
    if (property.type === 'title') {
      return { title: {} };
    }
    if (property.type === 'text') {
      return { rich_text: {} };
    }
    if (property.type === 'select') {
      return { select: { options: property.options || [] } };
    }
    return { rich_text: {} };
  }

  private convertContentToBlocks(content: string): any[] {
    if (!content.trim()) {
      return [];
    }

    return [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: content.slice(0, 2000) } // Notion limit
        }]
      }
    }];
  }
}