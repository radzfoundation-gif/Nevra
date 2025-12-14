/**
 * API Integration Wizard for NEVRA Builder
 * Connect to external APIs (REST, GraphQL) and auto-generate client code
 */

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    location: 'query' | 'path' | 'body' | 'header';
  }>;
  response?: {
    type: string;
    schema?: Record<string, any>;
  };
}

export interface APIConnection {
  id: string;
  name: string;
  baseUrl: string;
  type: 'rest' | 'graphql';
  authType?: 'none' | 'api-key' | 'bearer' | 'oauth2' | 'basic';
  apiKey?: string;
  bearerToken?: string;
  headers?: Record<string, string>;
  endpoints: APIEndpoint[];
  createdAt: Date;
}

/**
 * Generate API client code from connection
 */
export function generateAPIClient(connection: APIConnection): string {
  if (connection.type === 'rest') {
    return generateRESTClient(connection);
  } else {
    return generateGraphQLClient(connection);
  }
}

/**
 * Generate REST API client
 */
function generateRESTClient(connection: APIConnection): string {
  const authHeader = getAuthHeader(connection);
  
  const clientCode = `
// Generated API Client for ${connection.name}
const API_BASE_URL = '${connection.baseUrl}';

${authHeader}

// API Client Class
class APIClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.headers = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(\`API Error: \${response.status} \${response.statusText}\`);
    }

    return response.json();
  }

${connection.endpoints.map(endpoint => generateEndpointMethod(endpoint)).join('\n\n')}
}

// Export instance
export const apiClient = new APIClient();
`;
  
  return clientCode;
}

/**
 * Generate GraphQL client
 */
function generateGraphQLClient(connection: APIConnection): string {
  return `
// Generated GraphQL Client for ${connection.name}
const GRAPHQL_ENDPOINT = '${connection.baseUrl}';

${getAuthHeader(connection)}

class GraphQLClient {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor() {
    this.endpoint = GRAPHQL_ENDPOINT;
    this.headers = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
  }

  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(\`GraphQL Error: \${response.status}\`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }

  async mutate<T>(mutation: string, variables?: Record<string, any>): Promise<T> {
    return this.query<T>(mutation, variables);
  }
}

export const graphqlClient = new GraphQLClient();
`;
}

/**
 * Generate endpoint method
 */
function generateEndpointMethod(endpoint: APIEndpoint): string {
  const methodName = endpoint.path
    .split('/')
    .filter(p => p && !p.startsWith(':'))
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('') || 'request';
  
  const params = endpoint.parameters?.filter(p => p.location === 'path' || p.location === 'query') || [];
  const bodyParams = endpoint.parameters?.filter(p => p.location === 'body') || [];
  
  const methodParams = params.map(p => `${p.name}: ${p.type}${p.required ? '' : '?'}`).join(', ');
  const bodyParam = bodyParams.length > 0 ? `body: { ${bodyParams.map(p => p.name).join(', ')} }` : '';
  const allParams = [methodParams, bodyParam].filter(Boolean).join(', ');
  
  const queryString = params.filter(p => p.location === 'query').length > 0
    ? `const queryParams = new URLSearchParams({ ${params.filter(p => p.location === 'query').map(p => `${p.name}`).join(', ')} });`
    : '';
  
  const pathParams = params.filter(p => p.location === 'path');
  let processedPath = endpoint.path;
  pathParams.forEach(param => {
    processedPath = processedPath.replace(`:${param.name}`, `\${${param.name}}`);
  });
  
  const url = queryString 
    ? `\`\${this.baseUrl}${processedPath}?\${queryParams.toString()}\``
    : `\`\${this.baseUrl}${processedPath}\``;
  
  return `
  async ${methodName}(${allParams}): Promise<${endpoint.response?.type || 'any'}> {
    ${queryString}
    return this.request<${endpoint.response?.type || 'any'}>(${url}, {
      method: '${endpoint.method}',
      ${bodyParams.length > 0 ? 'body: JSON.stringify(body),' : ''}
    });
  }`;
}

/**
 * Get authentication header code
 */
function getAuthHeader(connection: APIConnection): string {
  switch (connection.authType) {
    case 'api-key':
      return `
const defaultHeaders = {
  'X-API-Key': '${connection.apiKey || 'YOUR_API_KEY'}',
};
`;
    case 'bearer':
      return `
const defaultHeaders = {
  'Authorization': \`Bearer ${connection.bearerToken || 'YOUR_TOKEN'}\`,
};
`;
    case 'basic':
      return `
const defaultHeaders = {
  'Authorization': \`Basic \${btoa('username:password')}\`,
};
`;
    default:
      return `const defaultHeaders = {};`;
  }
}

/**
 * Test API endpoint
 */
export async function testAPIEndpoint(
  connection: APIConnection,
  endpoint: APIEndpoint,
  params?: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    let url = `${connection.baseUrl}${endpoint.path}`;
    
    // Replace path parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`:${key}`, String(value));
      });
    }
    
    // Add query parameters
    const queryParams = endpoint.parameters
      ?.filter(p => p.location === 'query' && params?.[p.name])
      .map(p => `${p.name}=${encodeURIComponent(params[p.name])}`)
      .join('&');
    
    if (queryParams) {
      url += `?${queryParams}`;
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...connection.headers,
    };
    
    // Add auth headers
    if (connection.authType === 'api-key' && connection.apiKey) {
      headers['X-API-Key'] = connection.apiKey;
    } else if (connection.authType === 'bearer' && connection.bearerToken) {
      headers['Authorization'] = `Bearer ${connection.bearerToken}`;
    }
    
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      body: endpoint.method !== 'GET' && params
        ? JSON.stringify(params)
        : undefined,
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Request failed',
    };
  }
}
