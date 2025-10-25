import type { NavigationNode } from '../types/navigation';

const cloneNode = (node: NavigationNode): NavigationNode => ({
  ...node,
  children: (node.children ?? []).map(cloneNode)
});

const findNodeByKey = (nodes: NavigationNode[] | undefined, key: string): NavigationNode | undefined => {
  if (!nodes?.length) {
    return undefined;
  }
  return nodes.find((node) => node.key === key);
};

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

export const ensureStatusConfigurationEntry = (
  nodes: NavigationNode[] = [],
  defaults: NavigationNode[] = []
): NavigationNode[] => {
  const normalizedDefaults = defaults ?? [];
  const cloned = nodes.map((node) => {
    const defaultDefinition = findNodeByKey(normalizedDefaults, node.key);
    const ensuredChildren = ensureStatusConfigurationEntry(
      node.children ?? [],
      defaultDefinition?.children ?? []
    );
    return {
      ...node,
      children: ensuredChildren
    };
  });

  const configurationDefault = findNodeByKey(normalizedDefaults, 'configuration');
  if (!configurationDefault) {
    return cloned;
  }

  const statusDefault = findNodeByKey(configurationDefault.children ?? [], 'statusConfiguration');
  if (!statusDefault) {
    return cloned;
  }

  const configurationIndex = cloned.findIndex((node) => node.key === 'configuration');

  if (configurationIndex === -1) {
    return [...cloned, cloneNode(configurationDefault)];
  }

  const configurationNode = cloned[configurationIndex];
  const ensuredChildren = ensureStatusConfigurationEntry(
    configurationNode.children ?? [],
    configurationDefault.children ?? []
  );
  const hasStatus = ensuredChildren.some((child) => child.key === 'statusConfiguration');

  cloned[configurationIndex] = {
    ...configurationNode,
    children: hasStatus ? ensuredChildren : [...ensuredChildren, cloneNode(statusDefault)]
  };

  return cloned;
};
