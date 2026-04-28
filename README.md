# 🧠 Nexus Neural OS (v3.15)

Nexus is an advanced, obsidian-inspired neural workspace designed for high-performance knowledge management. It combines rich-text editing, neural network visualization, and multi-dimensional project management (Kanban/Tasks) into a single, cohesive glassmorphic interface.

## 🏗️ System Architecture

Nexus is built with a **Local-First, Cloud-Synced** philosophy.

- **Frontend**: Vite + React 18 + TypeScript.
- **State Management**: Zustand with `persist` middleware for offline-ready performance and state durability.
- **Rich Text Engine**: Tiptap (Headless Prosemirror) with custom extensions for Mermaid diagrams, Math, and Neural Links.
- **Styling**: Modern Glassmorphism using Vanilla CSS variables for high-performance transitions and deep theme support.
- **Backend**: Supabase (PostgreSQL + Auth + Realtime).

## 📊 Database Schema (PostgreSQL / Supabase)

Nexus uses a normalized graph-like structure stored in PostgreSQL.

### `pages` table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier for the page |
| `user_id` | UUID (FK) | Reference to the Supabase Auth user |
| `title` | TEXT | Display title of the neural node |
| `type` | ENUM | `normal`, `journal`, `folder`, `kanban` |
| `root_blocks` | UUID[] | Array of top-level block IDs |
| `tags` | TEXT[] | Metadata tags for neural filtering |
| `parent_page_id` | UUID | Self-referencing FK for nested hierarchies |

### `blocks` table
| Column | Type | Description |
| :--- | :--- | :--- |
| `uuid` | UUID (PK) | Unique block identifier |
| `page_id` | UUID (FK) | Parent page container |
| `content` | TEXT | Markdown or HTML content string |
| `block_type` | TEXT | `text`, `heading1`, `image`, `code`, etc. |
| `children` | UUID[] | Nested children blocks (for outliners) |
| `properties` | JSONB | Dynamic metadata (priority, status, etc.) |

## 🔄 Data Flow & Synchronization

Nexus implements an optimistic, idempotent synchronization engine.

1.  **Input**: User types in the `NexusEditor`.
2.  **State Update**: Changes are immediately written to the **Zustand Store**.
3.  **Persistence**: The store syncs to `localStorage`, ensuring data survives tab closes or network loss.
4.  **Transaction Middleware**: Changes are batched and pushed to **Supabase** using an idempotent `upsert` strategy.
5.  **Realtime Broadcast**: Supabase Realtime notifies other active neural nodes (tabs/devices) to refresh their cache, maintaining global consistency.

## 🚀 Key Features

### 1. Neural Task Matrix
A centralized intelligence hub that aggregates every task across your entire workspace. It parses both Kanban boards and Tiptap checklists into a unified, actionable grid.

### 2. Multi-Dimensional Kanban
- **Page Kanban**: Transform any document into a visual board where top-level blocks become columns.
- **Database Kanban**: High-performance views for structured records with dynamic grouping.

### 3. Neural Matrix (Graph View)
An interactive Cytoscape.js visualization that maps the connections between your ideas. It identifies clusters and isolated nodes, helping you discover hidden insights.

### 4. Dynamic Workspace (Wide View)
Switch between a focused **1000px Standard View** and an expansive **1400px Wide Mode** for complex data engineering and large-scale diagrams.

### 5. Advanced Neural Editor
- **Mermaid Support**: Integrated flowcharts and diagrams.
- **Neural Backlinks**: Automatic bidirectional linking in the Inspector panel.
- **Command Palette**: `Ctrl+P` for lightning-fast navigation across thousands of nodes.

---
*Built for the future of thought.*
