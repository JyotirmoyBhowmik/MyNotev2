import MermaidPlugin from '../plugins/mermaid';
import KanbanPlugin from '../plugins/kanban';
import { NexusPlugin } from '../types/plugin';

export const NexusPluginRegistry: NexusPlugin[] = [
  MermaidPlugin,
  KanbanPlugin,
];

export const getRegisteredExtensions = () => {
  return NexusPluginRegistry.flatMap(plugin => plugin.extensions);
};
