import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  MapPin,
  ExternalLink,
  Trash2,
  Edit2,
  Sparkles,
  Kanban,
  Table as TableIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';
import { JobApplication, ApplicationStatus, UserProfile } from '../types';
import { storage } from '../lib/storage';
import {
  fetchUserApplicationsFromCloud,
  saveApplicationToCloud,
  deleteApplicationFromCloud,
  logFeatureUsageToCloud,
} from '../lib/supabase';
import { InterviewPrepModal } from './InterviewPrepModal';
import { ApplicationHeatmap } from './ApplicationHeatmap';

const STATUS_COLUMNS: Array<{ id: ApplicationStatus; label: string; color: string; border: string }> = [
  { id: 'wishlist', label: 'Wishlist / To Apply', color: 'text-slate-400', border: 'border-slate-800' },
  { id: 'applied', label: 'Applied', color: 'text-indigo-400', border: 'border-indigo-900/60' },
  { id: 'screening', label: 'Recruiter Screen', color: 'text-violet-400', border: 'border-violet-900/60' },
  { id: 'interviewing', label: 'Interview Scheduled', color: 'text-cyan-400', border: 'border-cyan-900/60' },
  { id: 'offered', label: 'Offer Received', color: 'text-emerald-400', border: 'border-emerald-900/60' },
  { id: 'rejected', label: 'Archived / Rejected', color: 'text-slate-500', border: 'border-slate-900' },
];

interface ApplicationTrackerProps {
  currentUser?: UserProfile | null;
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ currentUser }) => {
  const [applications, setApplications] = useState<JobApplication[]>(
    storage.getApplications(currentUser?.id)
  );
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);

  // Form Fields
  const [formCompany, setFormCompany] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('Remote / Hybrid');
  const [formSalary, setFormSalary] = useState('');
  const [formAppDate, setFormAppDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<ApplicationStatus>('applied');
  const [formInterviewDate, setFormInterviewDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formJobUrl, setFormJobUrl] = useState('');
  const [formMatchScore, setFormMatchScore] = useState<number | undefined>(undefined);

  // Interview Prep Modal
  const [prepModalApp, setPrepModalApp] = useState<JobApplication | null>(null);

  const refreshApplications = () => {
    setApplications(storage.getApplications(currentUser?.id));
  };

  useEffect(() => {
    setApplications(storage.getApplications(currentUser?.id));
    if (currentUser?.id) {
      fetchUserApplicationsFromCloud(currentUser.id).then((cloudApps) => {
        if (cloudApps && cloudApps.length > 0) {
          storage.saveApplications(cloudApps, currentUser.id);
          setApplications(cloudApps);
        }
      });
    }
  }, [currentUser?.id]);

  const handleOpenAddModal = () => {
    setEditingApp(null);
    setFormCompany('');
    setFormTitle('');
    setFormLocation('Remote / Hybrid');
    setFormSalary('');
    setFormAppDate(new Date().toISOString().split('T')[0]);
    setFormStatus('applied');
    setFormInterviewDate('');
    setFormNotes('');
    setFormJobUrl('');
    setFormMatchScore(85);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (app: JobApplication) => {
    setEditingApp(app);
    setFormCompany(app.companyName);
    setFormTitle(app.jobTitle);
    setFormLocation(app.location || '');
    setFormSalary(app.salaryRange || '');
    setFormAppDate(app.applicationDate);
    setFormStatus(app.status);
    setFormInterviewDate(app.interviewDate || '');
    setFormNotes(app.notes || '');
    setFormJobUrl(app.jobUrl || '');
    setFormMatchScore(app.matchScore);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formTitle) return;

    const appData = {
      companyName: formCompany,
      jobTitle: formTitle,
      location: formLocation,
      salaryRange: formSalary,
      applicationDate: formAppDate,
      status: formStatus,
      interviewDate: formInterviewDate || undefined,
      notes: formNotes,
      jobUrl: formJobUrl || undefined,
      matchScore: formMatchScore,
    };

    if (editingApp) {
      storage.updateApplication(editingApp.id, appData, currentUser?.id);
      if (currentUser?.id) {
        saveApplicationToCloud(currentUser.id, { id: editingApp.id, ...appData });
      }
    } else {
      const created = storage.addApplication(appData, currentUser?.id);
      if (currentUser?.id) {
        saveApplicationToCloud(currentUser.id, created);
        logFeatureUsageToCloud(currentUser.id, 'job_application', {
          company: appData.companyName,
          role: appData.jobTitle,
          status: appData.status,
          matchScore: appData.matchScore,
        });
      }
      storage.addUsageLog(
        'job_application',
        `Tracked application for ${appData.jobTitle} at ${appData.companyName}`,
        { company: appData.companyName, role: appData.jobTitle, status: appData.status },
        currentUser?.id
      );
    }

    setIsModalOpen(false);
    refreshApplications();
  };

  const handleDelete = (id: string) => {
    storage.deleteApplication(id, currentUser?.id);
    if (currentUser?.id) {
      deleteApplicationFromCloud(currentUser.id, id);
    }
    refreshApplications();
  };

  const handleQuickStatusChange = (appId: string, newStatus: ApplicationStatus) => {
    storage.updateApplication(appId, { status: newStatus }, currentUser?.id);
    if (currentUser?.id) {
      saveApplicationToCloud(currentUser.id, { id: appId, status: newStatus });
    }
    refreshApplications();
  };

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.notes && app.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesDate =
      !selectedDate ||
      app.applicationDate === selectedDate ||
      app.applicationDate.startsWith(selectedDate);

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Tracker Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2638] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-emerald-400" />
            Job Application Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track interview dates, salaries, offer stages, and prepare custom Gemini interview responses for each employer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-[#0e121b] border border-[#1e2638] rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-violet-950/80 text-violet-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-violet-950/80 text-violet-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Application
          </button>
        </div>
      </div>

      {/* Interactive D3.js Application Activity Heatmap */}
      <ApplicationHeatmap
        applications={applications}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-[#0e121b] border border-[#1e2638]">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, role, or keywords..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#090b10] border border-[#1e2638] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {selectedDate && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-700 text-xs text-cyan-200">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Date: {selectedDate}</span>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-0.5 hover:text-white rounded"
                title="Clear date filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#090b10] border border-[#1e2638] rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
          >
            <option value="all">All Stages ({applications.length})</option>
            {STATUS_COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>
                {col.label} ({applications.filter((a) => a.status === col.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {STATUS_COLUMNS.map((column) => {
            const colApps = filteredApps.filter((a) => a.status === column.id);

            return (
              <div
                key={column.id}
                className="flex flex-col rounded-xl bg-[#090b10] border border-[#1e2638] min-h-[450px]"
              >
                {/* Column Header */}
                <div className={`p-3 border-b ${column.border} flex items-center justify-between`}>
                  <span className={`text-xs font-semibold ${column.color} truncate`}>
                    {column.label}
                  </span>
                  <span className="font-mono text-xs text-slate-400 px-1.5 py-0.5 rounded bg-[#0e121b] border border-[#1e2638]">
                    {colApps.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
                  {colApps.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-600">
                      No jobs in this stage
                    </div>
                  ) : (
                    colApps.map((app) => (
                      <div
                        key={app.id}
                        className="p-3.5 rounded-lg bg-[#0e121b] border border-[#1e2638] hover:border-slate-700 transition-all space-y-2 relative group shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white truncate max-w-[150px]">
                              {app.companyName}
                            </h4>
                            <p className="text-[11px] text-slate-300 font-medium truncate max-w-[150px]">
                              {app.jobTitle}
                            </p>
                          </div>

                          {app.matchScore && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold shrink-0">
                              {app.matchScore}%
                            </span>
                          )}
                        </div>

                        {app.location && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span className="truncate">{app.location}</span>
                          </div>
                        )}

                        {app.interviewDate && (
                          <div className="text-[10px] text-cyan-400 font-medium flex items-center gap-1 bg-cyan-950/40 p-1.5 rounded border border-cyan-900/40">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>Interview: {app.interviewDate}</span>
                          </div>
                        )}

                        {app.notes && (
                          <p className="text-[10px] text-slate-400 line-clamp-2 italic">
                            "{app.notes}"
                          </p>
                        )}

                        {/* Card Controls */}
                        <div className="pt-2 border-t border-[#1e2638] flex items-center justify-between text-xs">
                          {/* Interview Prep Button */}
                          <button
                            onClick={() => setPrepModalApp(app)}
                            title="Generate AI Interview Prep for this company"
                            className="px-2 py-0.5 text-[10px] font-semibold rounded bg-violet-950/80 border border-violet-800 text-violet-300 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            Prep Q&A
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(app)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Edit Application"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(app.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
                              title="Delete Application"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Move status dropdown */}
                        <div className="mt-1">
                          <select
                            value={app.status}
                            onChange={(e) =>
                              handleQuickStatusChange(app.id, e.target.value as ApplicationStatus)
                            }
                            className="w-full text-[10px] p-1 bg-[#090b10] border border-[#1e2638] rounded text-slate-400 focus:outline-none"
                          >
                            {STATUS_COLUMNS.map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                Move: {sc.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="p-5 rounded-xl bg-[#0e121b] border border-[#1e2638]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1e2638] text-slate-400">
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Job Title</th>
                  <th className="pb-3 font-medium">Stage</th>
                  <th className="pb-3 font-medium">Applied Date</th>
                  <th className="pb-3 font-medium">Interview Date</th>
                  <th className="pb-3 font-medium">Est. Match</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2638]/50">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-semibold text-white">{app.companyName}</td>
                    <td className="py-3 text-slate-300">{app.jobTitle}</td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                          app.status === 'offered'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : app.status === 'interviewing'
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                            : app.status === 'screening'
                            ? 'bg-violet-950/80 text-violet-300 border border-violet-800'
                            : 'bg-slate-900 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">{app.applicationDate}</td>
                    <td className="py-3 font-mono text-cyan-400">
                      {app.interviewDate || '—'}
                    </td>
                    <td className="py-3 font-mono text-slate-300">
                      {app.matchScore ? `${app.matchScore}%` : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPrepModalApp(app)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded bg-[#090b10] border border-[#1e2638] text-violet-300 hover:border-violet-600 transition-colors"
                        >
                          Prep Q&A
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(app)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Application Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0e121b] border border-[#1e2638] shadow-2xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              {editingApp ? 'Edit Job Application' : 'Log New Job Application'}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Stripe, Linear"
                    className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Frontend Engineer"
                    className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. San Francisco / Remote"
                    className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Salary Range</label>
                  <input
                    type="text"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    placeholder="e.g. $110,000 - $130,000"
                    className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Application Date</label>
                  <input
                    type="date"
                    value={formAppDate}
                    onChange={(e) => setFormAppDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Application Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ApplicationStatus)}
                    className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    {STATUS_COLUMNS.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Upcoming Interview Date</label>
                  <input
                    type="date"
                    value={formInterviewDate}
                    onChange={(e) => setFormInterviewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Estimated Match Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formMatchScore || ''}
                    onChange={(e) => setFormMatchScore(Number(e.target.value) || undefined)}
                    placeholder="e.g. 88"
                    className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Job Post URL</label>
                <input
                  type="url"
                  value={formJobUrl}
                  onChange={(e) => setFormJobUrl(e.target.value)}
                  placeholder="https://company.com/careers/..."
                  className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Internal Notes & Context</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Recruiter contact, referral names, interview rounds, salary expectations..."
                  rows={3}
                  className="w-full p-2.5 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2638]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#131826] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {editingApp ? 'Save Changes' : 'Log Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interview Prep Coach Modal */}
      {prepModalApp && (
        <InterviewPrepModal
          application={prepModalApp}
          onClose={() => setPrepModalApp(null)}
          resumeText={storage.getMasterResumeText()}
        />
      )}
    </div>
  );
};
