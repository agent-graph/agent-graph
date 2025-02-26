/**
 * reference: https://sdk.vercel.ai/cookbook/next/human-in-the-loop
 * */
import {
  convertToCoreMessages,
  DataStreamWriter,
  formatDataStreamPart,
  Message,
  ToolExecutionOptions,
  ToolSet,
} from 'ai';
import { z } from 'zod';
import { FSA, parseFSA } from './flux-standard-action';

export function isValidToolName<K extends PropertyKey, T extends object>(
  key: K,
  obj: T
): key is K & keyof T {
  return key in obj;
}

export interface ToolContext<Tools extends ToolSet> {
  tools: Tools; // used for type inference
  messages: Message[];
  stream: DataStreamWriter;
  abortSignal?: AbortSignal;
}

/** Processes tool invocations where human input is required, executing tools when authorized. */
export async function processToolCalls<
  Tools extends ToolSet,
  ExecutableTools extends {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    [Tool in keyof Tools as Tools[Tool] extends { execute: Function } ? never : Tool]: Tools[Tool];
  },
>(
  { stream, messages, abortSignal }: ToolContext<Tools>,
  executeFunctions: {
    [K in keyof Tools & keyof ExecutableTools]?: (
      args: z.infer<ExecutableTools[K]['parameters']>,
      context: ToolExecutionOptions & { action: FSA }
    ) => Promise<unknown>;
  }
): Promise<{ messages: Message[]; processed: boolean }> {
  let processed = false;
  const lastMessage = messages.at(-1);
  if (!lastMessage) return { messages, processed };
  const parts = lastMessage.parts;
  if (!parts) return { messages, processed };

  // Only process tool invocations parts
  const toolInvocationParts = parts.filter((part) => part.type === 'tool-invocation');

  const processedParts = await Promise.all(
    toolInvocationParts.map(async (part) => {
      const { toolInvocation } = part;
      const { toolCallId, toolName, state, args } = toolInvocation;
      if (state !== 'result') return part;
      if (!isValidToolName(toolName, executeFunctions)) return part;

      // check if the human action is FSA
      const { isFSA, action } = parseFSA(toolInvocation.result);
      if (!isFSA) {
        console.warn('Invalid FSA:', JSON.stringify(part, null, 2));
        return part;
      }

      const toolInstance = executeFunctions[toolName];

      if (!toolInstance) {
        console.warn(`No execute function found on tool: ${toolName}`);
        return part;
      }
      const coreMessages = convertToCoreMessages(messages);
      const context = { messages: coreMessages, toolCallId, abortSignal, action };
      const result = await toolInstance(args, context);
      // Forward updated tool result to the client.
      stream.write(formatDataStreamPart('tool_result', { toolCallId, result }));
      processed = true;

      // Return updated toolInvocation with the actual result.
      return { ...part, toolInvocation: { ...toolInvocation, result } };
    })
  );

  // Finally return the processed messages
  return {
    messages: [...messages.slice(0, -1), { ...lastMessage, parts: processedParts }],
    processed,
  };
}

export function getToolsRequiringConfirmation<T extends ToolSet>(tools: T): string[] {
  return (Object.keys(tools) as (keyof T)[]).filter((key) => {
    const maybeTool = tools[key];
    return typeof maybeTool!.execute !== 'function';
  }) as string[];
}
