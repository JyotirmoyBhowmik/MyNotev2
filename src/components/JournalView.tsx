import React, { useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import './JournalView.css';

interface JournalViewProps {
  onClose: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ onClose }) => {
  const { pages, setActivePage, createDailyPage } = useGraphStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const journalPages = Object.values(pages).filter(p => p.type === 'journal');
  const journalDates = journalPages.map(p => ({ date: new Date(p.created_at), page: p }));

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();

  const getPageForDay = (day: Date) =>
    journalDates.find(jd => isSameDay(jd.date, day) || jd.page.title === format(day, 'MMMM d, yyyy'));

  const handleDayClick = async (day: Date) => {
    const existing = getPageForDay(day);
    if (existing) {
      setActivePage(existing.page.id);
    } else {
      const title = format(day, 'MMMM d, yyyy');
      // Navigate to that date
      const dayPage = Object.values(pages).find(p => p.title === title);
      if (dayPage) setActivePage(dayPage.id);
      else {
        const np = await createDailyPage();
        // If not today's date, just navigate
        setActivePage(np.id);
      }
    }
    onClose();
  };

  return (
    <div className="journal-view">
      <div className="journal-header">
        <div className="journal-title">
          <span>📅 Journal</span>
        </div>
        <button className="journal-close" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="journal-content">
        {/* Calendar */}
        <div className="journal-calendar">
          <div className="cal-header">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16} /></button>
            <span>{format(currentMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} /></button>
          </div>
          <div className="cal-weekdays">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="cal-weekday">{d}</div>)}
          </div>
          <div className="cal-grid">
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="cal-empty" />)}
            {days.map(day => {
              const hasPage = !!getPageForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`cal-day ${isToday(day) ? 'today' : ''} ${hasPage ? 'has-entry' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <span>{format(day, 'd')}</span>
                  {hasPage && <span className="cal-dot" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent journal entries */}
        <div className="journal-entries">
          <div className="journal-entries-title">Recent Entries</div>
          {journalPages
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, 20)
            .map(p => (
              <div key={p.id} className="journal-entry" onClick={() => { setActivePage(p.id); onClose(); }}>
                <span className="journal-entry-date">{p.title}</span>
              </div>
            ))}
          {journalPages.length === 0 && (
            <div className="journal-empty">No journal entries yet. Click a date to create one.</div>
          )}
        </div>
      </div>
    </div>
  );
};
