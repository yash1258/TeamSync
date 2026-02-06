'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const sectionRef = useRef<HTMLDivElement>(null);

  // Fetch real data from Convex
  const milestones = useQuery(api.calendar.listMilestones) ?? [];
  const events = useQuery(api.calendar.listEvents, {
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  }) ?? [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-slide-up');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('.animate-on-scroll');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [milestones, events]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const getMilestoneForDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return milestones.find(milestone => milestone.dueDate === dateStr);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'in-progress':
        return <Circle className="w-4 h-4 text-blue-400" />;
      case 'upcoming':
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-500/20 text-blue-400';
      case 'review':
        return 'bg-amber-500/20 text-amber-400';
      case 'presentation':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Loading state
  if (milestones === undefined || events === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="space-y-6">
      {/* Header */}
      <div className="animate-on-scroll opacity-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Calendar</h1>
          <p className="text-gray-400 text-sm">View milestones and upcoming events</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#0B0B0B] border border-[#232323] rounded-lg">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'
                }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'
                }`}
            >
              Week
            </button>
          </div>

          <button className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200">
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 border-b border-[#232323] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">{monthName} {year}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1.5 rounded-lg hover:bg-[#181818] text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1.5 rounded-lg hover:bg-[#181818] text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-sm text-[#F0FF7A] hover:underline"
          >
            Today
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-[#232323]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDay }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[100px] border-b border-r border-[#232323] bg-[#0B0B0B]/50" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayEvents = getEventsForDate(day);
            const milestone = getMilestoneForDate(day);
            const isToday = new Date().toDateString() === new Date(year, currentDate.getMonth(), day).toDateString();

            return (
              <div
                key={day}
                className={`min-h-[100px] border-b border-r border-[#232323] p-2 hover:bg-[#181818] transition-colors ${isToday ? 'bg-[#F0FF7A]/5' : ''
                  }`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[#F0FF7A]' : 'text-gray-400'}`}>
                  {day}
                </div>

                {/* Milestone */}
                {milestone && (
                  <div className={`mb-1 p-1.5 rounded text-xs ${milestone.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    milestone.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(milestone.status)}
                      <span className="truncate">{milestone.title}</span>
                    </div>
                  </div>
                )}

                {/* Events */}
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event._id}
                    className={`mb-1 p-1.5 rounded text-xs ${getEventTypeColor(event.type)}`}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">{event.title}</span>
                    </div>
                  </div>
                ))}

                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Milestones */}
      <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#232323] flex items-center justify-between">
          <h2 className="font-semibold">Upcoming Milestones</h2>
          <button className="text-sm text-[#F0FF7A] hover:underline">View all</button>
        </div>
        <div className="divide-y divide-[#232323]">
          {milestones.map((milestone) => (
            <div key={milestone._id} className="p-4 hover:bg-[#181818] transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getStatusIcon(milestone.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium">{milestone.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${milestone.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                      milestone.status === 'in-progress' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                      {milestone.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{milestone.description}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Due {milestone.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 h-1.5 bg-[#181818] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${milestone.status === 'completed' ? 'bg-green-500' :
                            milestone.status === 'in-progress' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }`}
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{milestone.progress}%</span>
                    </div>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-[#232323] text-gray-500">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {milestones.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No milestones yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
