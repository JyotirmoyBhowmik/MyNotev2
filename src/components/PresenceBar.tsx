import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGraphStore } from '../store/graphStore';

interface PresenceState {
  user_id: string;
  email: string;
  online_at: string;
}

export const PresenceBar: React.FC = () => {
  const { user, profile } = useAuthStore();
  const { activePageId } = useGraphStore();
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);

  useEffect(() => {
    if (!user || !activePageId) return;

    const channel = supabase.channel(`page:${activePageId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = Object.values(newState).flat() as any;
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            email: user.email,
            full_name: profile?.full_name || user.email,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile, activePageId]);

  if (onlineUsers.length <= 1) return null;

  return (
    <div className="presence-bar">
      <div className="presence-avatars">
        {onlineUsers.map((u, i) => (
          <div 
            key={`${u.user_id}-${i}`} 
            className="presence-avatar" 
            title={u.email}
            style={{ zIndex: onlineUsers.length - i }}
          >
            {u.email?.[0].toUpperCase()}
            <span className="presence-dot" />
          </div>
        ))}
      </div>
      <span className="presence-count">
        {onlineUsers.length} active now
      </span>
    </div>
  );
};
