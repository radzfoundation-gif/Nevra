/**
 * Document Parser for NEVRA Tutor
 * Handles PDF, DOCX, TXT, and Markdown file parsing
 */

export interface ParsedDocument {
  title: string;
  content: string;
  pages?: number;
  sections?: DocumentSection[];
  metadata?: {
    author?: string;
    createdAt?: string;
    wordCount?: number;
  };
}

export interface DocumentSection {
  title: string;
  content: string;
  pageNumber?: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Upload and parse document
 */
export async function parseDocument(
  file: File
): Promise<ParsedDocument> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', file.type);

    const response = await fetch(`${API_BASE}/parse-document`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || response.statusText;
      throw new Error(`Document parsing failed: ${errorMessage}`);
    }

    const data = await response.json();
    return {
      title: data.title || file.name,
      content: data.content || '',
      pages: data.pages,
      sections: data.sections || [],
      metadata: data.metadata || {},
    };
  } catch (error) {
    console.error('Document parsing error:', error);
    throw error;
  }
}

/**
 * Extract text from document (client-side fallback for simple files)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        resolve(content);
      } else if (file.name.endsWith('.md')) {
        resolve(content);
      } else {
        // For other types, return basic info
        resolve(`File: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes\n\n[Content parsing requires server-side processing]`);
      }
    };

    reader.onerror = reject;
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      // For binary files, we need server-side processing
      reject(new Error('This file type requires server-side processing. Please use the upload feature.'));
    }
  });
}

/**
 * Search within document content
 */
export function searchInDocument(
  document: ParsedDocument,
  query: string
): DocumentSection[] {
  const queryLower = query.toLowerCase();
  const results: DocumentSection[] = [];

  // Search in main content
  if (document.content.toLowerCase().includes(queryLower)) {
    const lines = document.content.split('\n');
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(queryLower)) {
        results.push({
          title: `Line ${index + 1}`,
          content: line,
        });
      }
    });
  }

  // Search in sections
  if (document.sections) {
    document.sections.forEach((section) => {
      if (
        section.title.toLowerCase().includes(queryLower) ||
        section.content.toLowerCase().includes(queryLower)
      ) {
        results.push(section);
      }
    });
  }

  return results;
}

/**
 * Get document summary
 */
export function getDocumentSummary(document: ParsedDocument): string {
  const wordCount = document.content.split(/\s+/).length;
  const pageCount = document.pages || Math.ceil(wordCount / 500);
  
  let summary = `**${document.title}**\n\n`;
  summary += `- Pages: ${pageCount}\n`;
  summary += `- Word Count: ${wordCount}\n`;
  
  if (document.metadata?.author) {
    summary += `- Author: ${document.metadata.author}\n`;
  }
  
  if (document.sections && document.sections.length > 0) {
    summary += `- Sections: ${document.sections.length}\n`;
    summary += `\n**Sections:**\n`;
    document.sections.forEach((section, index) => {
      summary += `${index + 1}. ${section.title}\n`;
    });
  }
  
  return summary;
}
