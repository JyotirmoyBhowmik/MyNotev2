import { AnyExtension } from '@tiptap/core';
import { ReactNode } from 'react';

export interface NexusPlugin {
  id: string;
  name: string;
  version: string;
  
  /**
   * Tiptap extensions provided by this plugin.
   */
  extensions: AnyExtension[];

  /**
   * Optional UI components (e.g. settings panels, toolbar icons).
   */
  ui?: {
    toolbarIcon?: ReactNode;
    settingsPanel?: ReactNode;
  };

  /**
   * Lifecycle hook called when the plugin is registered.
   */
  onInit?: () => void;
}
