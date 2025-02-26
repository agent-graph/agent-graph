import { z } from 'zod';

/**
 * A Flux Standard action with optional payload and metadata properties.
 * reference: https://github.com/redux-utilities/flux-standard-action
 */
export interface FSA<Type extends string = string, Payload = undefined, Meta = undefined> {
  /**
   * The `type` of an action identifies to the consumer the nature of the action that has occurred.
   * Two actions with the same `type` MUST be strictly equivalent (using `===`)
   */
  type: Type;
  /**
   * The optional `payload` property MAY be any type of value.
   * It represents the payload of the action.
   * Any information about the action that is not the type or status of the action should be part of the `payload` field.
   * By convention, if `error` is `true`, the `payload` SHOULD be an error object.
   * This is akin to rejecting a promise with an error object.
   */
  payload?: Payload;
  /**
   * The optional `error` property MAY be set to true if the action represents an error.
   * An action whose `error` is true is analogous to a rejected Promise.
   * By convention, the `payload` SHOULD be an error object.
   * If `error` has any other value besides `true`, including `undefined`, the action MUST NOT be interpreted as an error.
   */
  error?: boolean;
  /**
   * The optional `meta` property MAY be any type of value.
   * It is intended for any extra information that is not part of the payload.
   */
  meta?: Meta;
}

const schema = z.object({
  type: z.string(),
  payload: z.any().optional(),
  error: z.boolean().optional(),
  meta: z.any().optional(),
});

export function isFSA(action: unknown): action is FSA {
  const { success } = schema.safeParse(action);
  return success;
}

export function isError(action: unknown) {
  return isFSA(action) && action.error === true;
}

export function parseFSA(
  action: unknown
): { action: FSA; isFSA: true } | { action: undefined; isFSA: false } {
  const result = schema.safeParse(action);
  if (!result.success) return { isFSA: false, action: undefined };
  return { action: result.data, isFSA: true };
}
