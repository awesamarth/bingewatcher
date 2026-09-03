type WebMCPTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, context?: { signal?: AbortSignal }) => Promise<string> | string;
};

interface ModelContext {
  registerTool(tool: WebMCPTool, options?: { signal?: AbortSignal; exposedTo?: string[] }): Promise<void>;
}

interface Document {
  readonly modelContext?: ModelContext;
}
