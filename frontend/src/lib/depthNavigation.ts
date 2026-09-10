import {
  normalizeExploration,
  type Branch,
  type Depth,
  type Exploration,
} from "./exploration";
import type { MicroAtlas, MicroNode } from "./micro";

export const NODE_DEPTH = {
  organ: 1,
  tissue: 2,
  cell: 3,
  organelle: 4,
} as const;

/** Follow declared parents/children, including same-level tissue or cell groups. */
export function nodeAtDepth(
  atlas: MicroAtlas | null,
  state: Exploration,
  target: Depth,
  branch: Branch = state.branch,
): MicroNode | undefined {
  if (!atlas || target === 0) return;
  const byId = new Map(atlas.nodes.map((node) => [node.id, node]));
  const selected = byId.get(state.microSelected);
  let current = selected?.branch === branch ? selected : byId.get(branch);
  const visited = new Set<string>();
  while (
    current &&
    NODE_DEPTH[current.depth] > target &&
    !visited.has(current.id)
  ) {
    visited.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  const descend = (root: MicroNode | undefined) => {
    const queue = root ? [root] : [];
    const seen = new Set<string>();
    while (queue.length) {
      const node = queue.shift()!;
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      if (NODE_DEPTH[node.depth] === target) return node;
      queue.push(
        ...node.children
          .map((id) => byId.get(id))
          .filter((node): node is MicroNode => !!node),
      );
    }
  };
  // Some selectable structures have no deeper illustrated child. The destination
  // is explicitly named in the UI when returning to the branch's teaching path.
  return descend(current) ?? descend(byId.get(branch));
}

export function navigateDepth(
  state: Exploration,
  target: Depth,
  atlas: MicroAtlas | null,
  branch: Branch = state.branch,
): Exploration {
  const node = nodeAtDepth(atlas, state, target, branch);
  return normalizeExploration({
    ...state,
    depth: target,
    branch,
    microSelected: target >= 2 ? (node?.id ?? "") : "",
    progress: 0,
    journey: "",
    view: {
      ...state.view,
      mode: target === 0 ? "specimen" : "anatomy",
      model: target > 0 ? "general" : state.view.model,
      selected: target > 0 ? branch : state.view.selected,
      compare: target > 0 ? "" : state.view.compare,
      isolate: false,
      hidden: [],
    },
  });
}
