export type ServerConfig = SSEConfig | StdioConfig

export type SSEConfig = {
  mode: 'sse'
  port?: number;
}

export type StdioConfig = {
  mode: 'stdio';
}

export const DEFAULT_CONFIG: ServerConfig = {
  mode: 'stdio',
}; 