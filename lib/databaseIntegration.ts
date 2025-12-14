/**
 * Database Integration for NEVRA Builder
 * Connect to Supabase/PostgreSQL and auto-generate schema from natural language
 */

export interface DatabaseColumn {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'uuid' | 'timestamp';
  nullable: boolean;
  defaultValue?: string;
  primaryKey?: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  indexes?: string[];
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
  relationships?: Array<{
    from: { table: string; column: string };
    to: { table: string; column: string };
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  }>;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'supabase' | 'postgresql' | 'mysql' | 'sqlite';
  connectionString?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  createdAt: Date;
}

class DatabaseManager {
  private connections: Map<string, DatabaseConnection> = new Map();
  private schemas: Map<string, DatabaseSchema> = new Map();

  /**
   * Create a new database connection
   */
  createConnection(config: Omit<DatabaseConnection, 'id' | 'createdAt'>): DatabaseConnection {
    const connection: DatabaseConnection = {
      ...config,
      id: `conn-${Date.now()}`,
      createdAt: new Date(),
    };
    this.connections.set(connection.id, connection);
    this.saveToStorage();
    return connection;
  }

  /**
   * Get all connections
   */
  getAllConnections(): DatabaseConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnection(id: string): DatabaseConnection | null {
    return this.connections.get(id) || null;
  }

  /**
   * Delete connection
   */
  deleteConnection(id: string): boolean {
    const deleted = this.connections.delete(id);
    this.schemas.delete(id);
    this.saveToStorage();
    return deleted;
  }

  /**
   * Generate schema from natural language description
   */
  async generateSchemaFromDescription(
    description: string,
    connectionId?: string
  ): Promise<DatabaseSchema> {
    // This would call AI to generate schema
    // For now, return a basic structure
    const schema: DatabaseSchema = {
      tables: [],
    };
    
    if (connectionId) {
      this.schemas.set(connectionId, schema);
    }
    
    return schema;
  }

  /**
   * Generate CRUD operations code for a table
   */
  generateCRUDCode(table: DatabaseTable, connection: DatabaseConnection): string {
    const tableName = table.name;
    const primaryKey = table.columns.find(col => col.primaryKey)?.name || 'id';
    
    if (connection.type === 'supabase') {
      return `
// Generated CRUD operations for ${tableName}
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('${connection.supabaseUrl}', '${connection.supabaseKey}');

// Create
export async function create${tableName}(data: Partial<${tableName}Data>) {
  const { data: result, error } = await supabase
    .from('${tableName}')
    .insert([data])
    .select();
  
  if (error) throw error;
  return result[0];
}

// Read (Get All)
export async function get${tableName}s() {
  const { data, error } = await supabase
    .from('${tableName}')
    .select('*');
  
  if (error) throw error;
  return data;
}

// Read (Get One)
export async function get${tableName}ById(${primaryKey}: string) {
  const { data, error } = await supabase
    .from('${tableName}')
    .select('*')
    .eq('${primaryKey}', ${primaryKey})
    .single();
  
  if (error) throw error;
  return data;
}

// Update
export async function update${tableName}(${primaryKey}: string, updates: Partial<${tableName}Data>) {
  const { data, error } = await supabase
    .from('${tableName}')
    .update(updates)
    .eq('${primaryKey}', ${primaryKey})
    .select();
  
  if (error) throw error;
  return data[0];
}

// Delete
export async function delete${tableName}(${primaryKey}: string) {
  const { error } = await supabase
    .from('${tableName}')
    .delete()
    .eq('${primaryKey}', ${primaryKey});
  
  if (error) throw error;
}

// Type definition
export interface ${tableName}Data {
${table.columns.map(col => `  ${col.name}: ${this.mapColumnTypeToTS(col.type)}${col.nullable ? ' | null' : ''};`).join('\n')}
}
`;
    }
    
    return `// CRUD operations for ${tableName} - ${connection.type}`;
  }

  /**
   * Map database column type to TypeScript type
   */
  private mapColumnTypeToTS(dbType: DatabaseColumn['type']): string {
    const mapping: Record<DatabaseColumn['type'], string> = {
      text: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'Date',
      json: 'Record<string, any>',
      uuid: 'string',
      timestamp: 'Date',
    };
    return mapping[dbType] || 'any';
  }

  /**
   * Generate SQL migration from schema
   */
  generateSQLMigration(schema: DatabaseSchema): string {
    const statements: string[] = [];
    
    schema.tables.forEach(table => {
      const columns = table.columns.map(col => {
        let sql = `  ${col.name} ${this.mapColumnTypeToSQL(col.type)}`;
        if (col.primaryKey) sql += ' PRIMARY KEY';
        if (!col.nullable) sql += ' NOT NULL';
        if (col.defaultValue) sql += ` DEFAULT ${col.defaultValue}`;
        return sql;
      }).join(',\n');
      
      statements.push(`CREATE TABLE IF NOT EXISTS ${table.name} (\n${columns}\n);`);
      
      if (table.indexes) {
        table.indexes.forEach(index => {
          statements.push(`CREATE INDEX IF NOT EXISTS idx_${table.name}_${index} ON ${table.name}(${index});`);
        });
      }
    });
    
    return statements.join('\n\n');
  }

  /**
   * Map database column type to SQL type
   */
  private mapColumnTypeToSQL(dbType: DatabaseColumn['type']): string {
    const mapping: Record<DatabaseColumn['type'], string> = {
      text: 'TEXT',
      number: 'INTEGER',
      boolean: 'BOOLEAN',
      date: 'DATE',
      json: 'JSONB',
      uuid: 'UUID',
      timestamp: 'TIMESTAMP',
    };
    return mapping[dbType] || 'TEXT';
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        connections: Array.from(this.connections.values()),
        schemas: Array.from(this.schemas.entries()).map(([id, schema]) => ({ id, schema })),
      };
      localStorage.setItem('nevra_database', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save database connections:', error);
    }
  }

  /**
   * Load from localStorage
   */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('nevra_database');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.connections) {
          data.connections.forEach((conn: any) => {
            this.connections.set(conn.id, {
              ...conn,
              createdAt: new Date(conn.createdAt),
            });
          });
        }
        if (data.schemas) {
          data.schemas.forEach(({ id, schema }: { id: string; schema: DatabaseSchema }) => {
            this.schemas.set(id, schema);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load database connections:', error);
    }
  }
}

// Singleton instance
export const databaseManager = new DatabaseManager();
databaseManager.loadFromStorage();
