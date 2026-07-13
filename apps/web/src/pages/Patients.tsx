import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Search, Plus, ShieldCheck, ShieldAlert, History, Edit, Trash2, X } from 'lucide-react';

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const page = 1;
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  
  // Loading & States
  const [loading, setLoading] = useState(false);
  const [timelinePatient, setTimelinePatient] = useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  
  // Add/Edit Modals
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [consentStatus, setConsentStatus] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    fetchPatients();
  }, [page, search, selectedTag]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(
        `/patients?page=${page}&limit=10&search=${search}&tag=${selectedTag}`
      );
      setPatients(data.patients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const body = {
      name,
      phone,
      dob: new Date(dob).toISOString(),
      gender,
      preferredLanguage,
      consentStatus,
      tags,
    };

    try {
      if (editingPatient) {
        await apiRequest(`/patients/${editingPatient.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest('/patients', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      closeForm();
      fetchPatients();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this patient?')) return;
    try {
      await apiRequest(`/patients/${id}`, { method: 'DELETE' });
      fetchPatients();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const viewTimeline = async (patient: any) => {
    setTimelinePatient(patient);
    try {
      const data = await apiRequest(`/patients/${patient.id}/timeline`);
      setTimelineEvents(data);
    } catch (err) {
      setTimelineEvents([]);
    }
  };

  const openEdit = (patient: any) => {
    setEditingPatient(patient);
    setName(patient.name);
    setPhone(patient.phone);
    setDob(patient.dob.split('T')[0]);
    setGender(patient.gender);
    setPreferredLanguage(patient.preferredLanguage);
    setConsentStatus(patient.consentStatus);
    setTagsInput(patient.tags.map((t: any) => t.tag).join(', '));
    setShowModal(true);
  };

  const closeForm = () => {
    setEditingPatient(null);
    setName('');
    setPhone('');
    setDob('');
    setGender('Male');
    setPreferredLanguage('English');
    setConsentStatus(false);
    setTagsInput('');
    setShowModal(false);
  };

  return (
    <div className="space-y-6 flex h-[calc(100vh-140px)] gap-6">
      {/* Directory Section */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto space-y-6 pr-2">
        {/* Controls */}
        <div className="glass-card p-6 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search patient names, contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <input
              type="text"
              placeholder="Filter by Tag (e.g. diabetes)"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 w-48"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition"
          >
            <Plus className="h-4 w-4" /> Add Patient
          </button>
        </div>

        {/* Directory Grid */}
        <div className="flex-1 bg-slate-900/20 border border-slate-800/80 rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/50">
                  <th className="px-6 py-4">Demographics</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Medical Tags</th>
                  <th className="px-6 py-4">Consent</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      Loading patient directory...
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      No matching patient profiles found.
                    </td>
                  </tr>
                ) : (
                  patients.map((pat) => (
                    <tr key={pat.id} className="hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{pat.name}</span>
                          <span className="text-xs text-slate-500 mt-0.5">
                            {pat.gender}, Age {new Date().getFullYear() - new Date(pat.dob).getFullYear()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{pat.phone}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {pat.tags.map((t: any) => (
                            <span
                              key={t.tag}
                              className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-medium"
                            >
                              {t.tag}
                            </span>
                          ))}
                          {pat.tags.length === 0 && (
                            <span className="text-[10px] text-slate-600 italic">No tags</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {pat.consentStatus ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
                            <ShieldCheck className="h-3 w-3" /> Granted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-medium">
                            <ShieldAlert className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => viewTimeline(pat)}
                            title="Timeline history"
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(pat)}
                            title="Edit"
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(pat.id)}
                            title="Delete"
                            className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Timeline Drawer / Details Sidebar */}
      {timelinePatient && (
        <div className="w-80 glass border-l border-slate-800/80 p-6 flex flex-col h-full overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <h3 className="font-bold text-white text-sm">{timelinePatient.name}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Chronological Activity History</p>
            </div>
            <button
              onClick={() => setTimelinePatient(null)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {timelineEvents.map((evt) => (
              <div key={evt.id} className="flex gap-4 relative pl-8">
                {/* Event Bullet */}
                <div className="absolute left-[5px] top-1 h-3 w-3 rounded-full border border-slate-950 bg-brand-500 ring-4 ring-brand-500/15" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-200 block">{evt.eventType}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(evt.occurredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  {evt.metadata && (
                    <pre className="text-[9px] bg-slate-900/50 p-2 rounded border border-slate-800/40 text-slate-400 max-w-full overflow-x-auto whitespace-pre-wrap font-mono mt-1.5">
                      {JSON.stringify(evt.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
            {timelineEvents.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-10">No events logged yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-6">
              {editingPatient ? 'Edit Patient Profile' : 'Add New Patient'}
            </h3>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXX XXXX"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Language Preference</label>
                  <input
                    type="text"
                    required
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    placeholder="e.g. Hindi, English"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Medical Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. diabetes, hypertension"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentStatus}
                  onChange={(e) => setConsentStatus(e.target.checked)}
                  className="h-4 w-4 bg-slate-900 border-slate-850 rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="consent" className="text-xs text-slate-300 font-medium">
                  DPDP Consent Granted (Authorize outreach notifications)
                </label>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  {editingPatient ? 'Save Profile' : 'Register Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
