import { normalizeLiving, type LivingState } from "./living";
export interface LivingNotebook {
  schemaVersion: 1;
  kind: "floraria-living";
  state: LivingState;
  note: string;
}
export function notebookText(state: LivingState, note: string) {
  return JSON.stringify(
    {
      schemaVersion: 1,
      kind: "floraria-living",
      state: normalizeLiving(state),
      note: note.slice(0, 12000),
    } satisfies LivingNotebook,
    null,
    2,
  );
}
export function parseLivingNotebook(text: string): LivingNotebook {
  if (new TextEncoder().encode(text).length > 64000)
    throw new Error("Notebook exceeds 64 KB");
  const value = JSON.parse(text);
  if (
    !value ||
    value.schemaVersion !== 1 ||
    value.kind !== "floraria-living" ||
    typeof value.note !== "string" ||
    value.note.length > 12000 ||
    !value.state ||
    typeof value.state !== "object"
  )
    throw new Error("Not a Floraria living notebook");
  const state = normalizeLiving(value.state);
  if (
    Object.keys(state).some(
      (key) => state[key as keyof LivingState] !== value.state[key],
    )
  )
    throw new Error("Invalid exploration values");
  return { schemaVersion: 1, kind: "floraria-living", state, note: value.note };
}
