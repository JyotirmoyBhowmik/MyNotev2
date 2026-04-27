import { useGraphStore } from '../store/graphStore';

export const exportBackup = () => {
  const { pages, blocks, trash } = useGraphStore.getState();
  
  const data = {
    version: '1.0',
    timestamp: Date.now(),
    pages,
    blocks,
    trash,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mynote_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importBackup = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // In a real app, we would iterate and insert into Supabase
        // For now, let's just log it or provide a warning
        console.log('Importing backup:', data);
        alert('Restore feature is coming soon! For now, please use the exported JSON for reference.');
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};
