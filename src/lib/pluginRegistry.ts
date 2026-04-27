import MermaidPlugin from '../plugins/mermaid';
import KanbanPlugin from '../plugins/kanban';
import type { NexusPlugin } from '../types/plugin';

export const NexusPluginRegistry: NexusPlugin[] = [
  MermaidPlugin,
  KanbanPlugin,
];

export const getRegisteredExtensions = () => {
  return NexusPluginRegistry.flatMap(plugin => plugin.extensions);
};
