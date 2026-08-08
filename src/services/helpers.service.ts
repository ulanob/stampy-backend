import { NotFoundError } from "../utils/validators";

export async function assertExists(
  getter: () => Promise<unknown | null>,
  errorMessage: string
): Promise<void> {
  const result = await getter();
  if (!result) throw new NotFoundError(errorMessage);
}