export type LlmJsonSchemaRequest = {
  system: string;
  userContent: string;
  schemaName: string;
  schema: Record<string, unknown>;
};

export interface LlmProvider {
  generateJson(request: LlmJsonSchemaRequest): Promise<string>;
}
