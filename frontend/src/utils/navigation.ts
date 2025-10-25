import type { NavigationNode } from '../types/navigation';

export const mergeMenuNodes = (
  stored: NavigationNode[] = [],
  defaults: NavigationNode[] = []
): NavigationNode[] => {
  if (!defaults.length) {
    return stored.map((node) => ({
      ...node,
      children: mergeMenuNodes(node.children ?? [], [])
    }));
  }

  const defaultMap = new Map(defaults.map((definition) => [definition.key, definition] as const));
  const usedKeys = new Set<string>();
  const result: NavigationNode[] = [];

  for (const node of stored ?? []) {
    const definition = defaultMap.get(node.key);
    if (definition) {
      const mergedChildren = mergeMenuNodes(node.children ?? [], definition.children ?? []);
      result.push({
        ...definition,
        ...node,
        children: mergedChildren
      });
      usedKeys.add(definition.key);
    } else {
      result.push({
        ...node,
        children: mergeMenuNodes(node.children ?? [], [])
      });
      usedKeys.add(node.key);
    }
  }

  for (const definition of defaults) {
    if (usedKeys.has(definition.key)) {
      continue;
    }
    result.push({
      ...definition,
      children: mergeMenuNodes([], definition.children ?? [])
    });
  }

  return result;
};
