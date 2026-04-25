# MyNote v2 🧠

A premium, networked-thought note-taking application built with **React**, **Supabase**, and **TipTap**. MyNote combines the speed of block-based editing with the power of graph-based knowledge management.

![MyNote Banner](https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&q=80&w=2071)

## ✨ Key Features

### 1. Multi-level Networked Knowledge
- **Nested Pages**: Organize your thoughts with an unlimited hierarchy of folders and sub-pages.
- **Bi-directional Linking**: Link blocks and pages seamlessly using the `((` trigger.
- **Real-time Sync**: Collaborative editing and instant cloud saving powered by Supabase Realtime.

### 2. High-Performance Nexus Editor
- **Block-based Architecture**: Every paragraph is a discrete data point.
- **Slash Commands**: Type `/` to insert headings, task lists, code blocks, images, and more.
- **Markdown Support**: Intuitive formatting that stays out of your way.

### 3. Integrated Tools
- **Journal**: Automatic daily pages for rapid logging and habit tracking.
- **OKR & Strategy**: Track your high-level goals and key results directly alongside your notes.
- **Interactive Graph View**: Visualize the connections between your ideas in 2D space.

### 4. Enterprise-Grade Foundation
- **Role-Based Access Control**: Secure admin panel for user and system management.
- **Optimized Layout**: Fully resizable panels with persistent state.
- **Dark Mode First**: Premium aesthetic designed for long-term focus.

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/JyotirmoyBhowmik/MyNotev2.git

# Install dependencies
npm install

# Start development server
npm run dev
```

### Key Commands
- `Ctrl + K` or `Cmd + K`: Open Global Search / Command Palette.
- `/`: Open block menu in the editor.
- `((`: Search and link another page or block.
- `Tab` / `Shift + Tab`: Indent or outdent blocks.

## 🛠️ Tech Stack
- **Frontend**: Vite, React 18, Tailwind CSS, Lucide Icons.
- **Editor**: TipTap (Headless Prosemirror).
- **Backend**: Supabase (PostgreSQL, Auth, Realtime).
- **State Management**: Zustand.

---

Built with ❤️ by [Jyotirmoy Bhowmik](https://github.com/JyotirmoyBhowmik)
