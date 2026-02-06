'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Plus,
  MoreHorizontal,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  Loader2
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function BudgetView() {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'reports'>('overview');
  const sectionRef = useRef<HTMLDivElement>(null);

  // Fetch real data from Convex
  const budgetCategories = useQuery(api.budget.listCategories) ?? [];
  const budgetStats = useQuery(api.budget.getStats);
  const expenses = useQuery(api.budget.listExpenses, { limit: 10 }) ?? [];

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
  }, [budgetCategories, expenses]);

  const totalAllocated = budgetStats?.totalAllocated ?? 0;
  const totalSpent = budgetStats?.totalSpent ?? 0;
  const totalRemaining = budgetStats?.totalRemaining ?? 0;
  const spentPercentage = budgetStats?.spentPercentage ?? 0;

  const getProgressColor = (percentage: number) => {
    if (percentage < 60) return 'bg-green-500';
    if (percentage < 85) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Approved</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">Rejected</span>;
      default:
        return null;
    }
  };

  // Loading state
  if (budgetCategories === undefined || budgetStats === undefined) {
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
          <h1 className="text-2xl font-semibold mb-1">Budget Overview</h1>
          <p className="text-gray-400 text-sm">Track project spending and manage finances</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#181818] border border-[#232323] rounded-lg text-sm hover:border-[#333] transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200">
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="animate-on-scroll opacity-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-[#F0FF7A]/10">
              <Wallet className="w-5 h-5 text-[#F0FF7A]" />
            </div>
            <div className="flex items-center gap-1 text-xs text-green-400">
              <TrendingUp className="w-3 h-3" />
              <span>On track</span>
            </div>
          </div>
          <p className="text-2xl font-semibold mb-1">${totalAllocated.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total Budget</p>
        </div>

        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-blue-500/10">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <TrendingDown className="w-3 h-3" />
              <span>{spentPercentage.toFixed(1)}% used</span>
            </div>
          </div>
          <p className="text-2xl font-semibold mb-1">${totalSpent.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total Spent</p>
        </div>

        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-green-500/10">
              <PieChart className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-center gap-1 text-xs text-green-400">
              <span>{totalAllocated > 0 ? ((totalRemaining / totalAllocated) * 100).toFixed(1) : 0}% left</span>
            </div>
          </div>
          <p className="text-2xl font-semibold mb-1">${totalRemaining.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Remaining</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-on-scroll opacity-0 flex items-center gap-1 p-1 bg-[#0B0B0B] border border-[#232323] rounded-lg w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: PieChart },
          { id: 'expenses', label: 'Expenses', icon: DollarSign },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                ? 'bg-[#181818] text-white'
                : 'text-gray-500 hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="animate-on-scroll opacity-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget by Category */}
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#232323] flex items-center justify-between">
              <h2 className="font-semibold">Budget by Category</h2>
              <button className="p-1.5 rounded-lg hover:bg-[#181818] text-gray-500">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {budgetCategories.map((item) => {
                const percentage = item.allocated > 0 ? (item.spent / item.allocated) * 100 : 0;
                return (
                  <div key={item._id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{item.category}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500">${item.spent.toLocaleString()}</span>
                        <span className="text-gray-600">/</span>
                        <span>${item.allocated.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#181818] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{percentage.toFixed(0)}% used</span>
                      <span className="text-xs text-green-400">${item.remaining.toLocaleString()} left</span>
                    </div>
                  </div>
                );
              })}
              {budgetCategories.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  No budget categories yet
                </div>
              )}
            </div>
          </div>

          {/* Budget Health */}
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#232323]">
              <h2 className="font-semibold">Budget Health</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Overall Progress */}
              <div className="bg-[#181818] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">Overall Progress</span>
                  <span className="text-sm font-medium">{spentPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-[#0B0B0B] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(spentPercentage)}`}
                    style={{ width: `${spentPercentage}%` }}
                  />
                </div>
              </div>

              {/* Alerts */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Alerts</h3>
                {budgetCategories.filter(item => item.allocated > 0 && (item.spent / item.allocated) > 0.85).map((item) => (
                  <div key={item._id} className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">
                        {item.category} budget running low
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Only ${item.remaining.toLocaleString()} remaining of ${item.allocated.toLocaleString()} allocated
                      </p>
                    </div>
                  </div>
                ))}
                {budgetCategories.filter(item => item.allocated > 0 && (item.spent / item.allocated) > 0.85).length === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-400">
                        All budgets on track
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        No immediate concerns with current spending
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#181818] rounded-lg p-3">
                  <p className="text-2xl font-semibold text-green-400">
                    {budgetCategories.filter(item => item.allocated > 0 && (item.spent / item.allocated) < 0.85).length}
                  </p>
                  <p className="text-xs text-gray-500">Under budget</p>
                </div>
                <div className="bg-[#181818] rounded-lg p-3">
                  <p className="text-2xl font-semibold text-amber-400">
                    {budgetCategories.filter(item => item.allocated > 0 && (item.spent / item.allocated) >= 0.85).length}
                  </p>
                  <p className="text-xs text-gray-500">Near limit</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#232323] flex items-center justify-between">
            <h2 className="font-semibold">Recent Expenses</h2>
            <button className="text-sm text-[#F0FF7A] hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#232323]">
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Description</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Category</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id} className="border-b border-[#232323] hover:bg-[#181818] transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-sm">{expense.description}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-400">{expense.category}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {expense.date}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">${expense.amount.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      {getStatusIcon(expense.status)}
                    </td>
                    <td className="p-4">
                      <button className="p-1.5 rounded-lg hover:bg-[#232323] text-gray-500">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No expenses yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="animate-on-scroll opacity-0 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <BarChart3 className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">Monthly Report</h3>
            <p className="text-sm text-gray-500 mb-4">Detailed spending analysis for this month</p>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#181818] border border-[#232323] rounded-lg text-sm hover:border-[#333] transition-colors">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>

          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <PieChart className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">Category Breakdown</h3>
            <p className="text-sm text-gray-500 mb-4">Spending distribution by department</p>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#181818] border border-[#232323] rounded-lg text-sm hover:border-[#333] transition-colors">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
