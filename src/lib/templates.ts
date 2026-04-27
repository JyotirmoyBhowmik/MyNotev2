export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  content: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'project-kickoff',
    name: 'Project Kickoff',
    description: 'Structure for starting a new project.',
    icon: '🚀',
    content: `<h1>Project Kickoff: [Project Name]</h1>
<p><strong>Date:</strong> [Today's Date]</p>
<p><strong>Owner:</strong> [Name]</p>
<hr>
<h2>Overview</h2>
<p>Describe the purpose of this project and what it aims to achieve.</p>
<h2>Goals</h2>
<ul>
  <li>[Goal 1]</li>
  <li>[Goal 2]</li>
</ul>
<h2>Milestones</h2>
<table style="width: 100%;">
  <thead>
    <tr>
      <th>Milestone</th>
      <th>Due Date</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Phase 1</td>
      <td>-</td>
      <td>Planning</td>
    </tr>
  </tbody>
</table>
<h2>Next Steps</h2>
<ul>
  <li>[ ] Finalize requirements</li>
  <li>[ ] Assemble team</li>
</ul>`
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Clean layout for capture meeting outcomes.',
    icon: '📝',
    content: `<h1>Meeting: [Topic]</h1>
<p><strong>Participants:</strong> [Names]</p>
<hr>
<h2>Agenda</h2>
<ul>
  <li>[Point 1]</li>
  <li>[Point 2]</li>
</ul>
<h2>Notes</h2>
<p>Capture key discussion points here...</p>
<h2>Action Items</h2>
<ul data-type="taskList">
  <li data-checked="false">Item 1</li>
  <li data-checked="false">Item 2</li>
</ul>`
  },
  {
    id: 'weekly-planner',
    name: 'Weekly Planner',
    description: 'Organize your week ahead.',
    icon: '📅',
    content: `<h1>Weekly Planner</h1>
<div class="grid grid-cols-2 gap-4">
  <div>
    <h3>Monday</h3>
    <ul><li></li></ul>
  </div>
  <div>
    <h3>Tuesday</h3>
    <ul><li></li></ul>
  </div>
  <div>
    <h3>Wednesday</h3>
    <ul><li></li></ul>
  </div>
  <div>
    <h3>Thursday</h3>
    <ul><li></li></ul>
  </div>
  <div>
    <h3>Friday</h3>
    <ul><li></li></ul>
  </div>
  <div>
    <h3>Weekend</h3>
    <ul><li></li></ul>
  </div>
</div>`
  }
];
