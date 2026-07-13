import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { BriefcaseMedical, Plus, Clock, CalendarDays, Trash2, CalendarRange } from 'lucide-react';

export default function Doctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState<any | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState<any | null>(null);

  // Add Doctor Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [consultationDurationMins, setConsultationDurationMins] = useState(15);

  // Set Availability Form Fields (initialized with Mon-Fri defaults)
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [availabilitiesForm, setAvailabilitiesForm] = useState<any[]>(
    weekdays.map((_, idx) => ({
      dayOfWeek: idx,
      enabled: idx >= 1 && idx <= 5, // Mon-Fri default
      startTime: '09:00',
      endTime: '17:00',
    }))
  );

  // Leave Form Fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/doctors');
      setDoctors(data);
    } catch (err) {
      setError('Failed to load doctor directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/doctors', {
        method: 'POST',
        body: JSON.stringify({
          specialization,
          consultationDurationMins: Number(consultationDurationMins),
          user: { name, email, phone, password },
        }),
      });
      setShowAddModal(false);
      clearAddForm();
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Onboarding doctor failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this doctor and their user account?')) return;
    try {
      await apiRequest(`/doctors/${id}`, { method: 'DELETE' });
      fetchDoctors();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAvailabilityModal) return;

    // Filter only enabled shifts
    const finalAvails = availabilitiesForm
      .filter((item) => item.enabled)
      .map((item) => ({
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
      }));

    try {
      await apiRequest(`/doctors/${showAvailabilityModal.id}/availability`, {
        method: 'POST',
        body: JSON.stringify({ availabilities: finalAvails }),
      });
      setShowAvailabilityModal(null);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Saving availability shifts failed.');
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLeaveModal) return;

    try {
      await apiRequest(`/doctors/${showLeaveModal.id}/leave`, {
        method: 'POST',
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          reason: leaveReason,
        }),
      });
      setShowLeaveModal(null);
      setStartDate('');
      setEndDate('');
      setLeaveReason('');
      alert('Leave logged successfully.');
    } catch (err: any) {
      alert(err.message || 'Applying leave failed.');
    }
  };

  const openAvailability = (doctor: any) => {
    // Populate form with existing shifts or defaults
    const populated = weekdays.map((_, idx) => {
      const match = doctor.availabilities?.find((a: any) => a.dayOfWeek === idx);
      return {
        dayOfWeek: idx,
        enabled: !!match,
        startTime: match ? match.startTime : '09:00',
        endTime: match ? match.endTime : '17:00',
      };
    });
    setAvailabilitiesForm(populated);
    setShowAvailabilityModal(doctor);
  };

  const clearAddForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setSpecialization('');
    setConsultationDurationMins(15);
  };

  const toggleDayAvailability = (index: number) => {
    const next = [...availabilitiesForm];
    next[index].enabled = !next[index].enabled;
    setAvailabilitiesForm(next);
  };

  const updateTimeAvailability = (index: number, key: 'startTime' | 'endTime', val: string) => {
    const next = [...availabilitiesForm];
    next[index][key] = val;
    setAvailabilitiesForm(next);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="glass-card p-6 rounded-xl flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-lg">Doctor Directory</h3>
          <p className="text-xs text-slate-400">Configure consultation durations and schedules</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition"
        >
          <Plus className="h-4 w-4" /> Onboard Doctor
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Grid of Doctors */}
      {loading ? (
        <div className="text-slate-500 text-center py-10">Loading doctor profiles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div key={doc.id} className="glass-card rounded-xl p-6 relative flex flex-col justify-between border border-slate-800/80">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-500/10 rounded-lg border border-brand-500/20">
                      <BriefcaseMedical className="h-5 w-5 text-brand-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Dr. {doc.user.name}</h4>
                      <span className="text-xs text-brand-500 font-semibold">{doc.specialization}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Info block */}
                <div className="text-xs space-y-2 border-t border-slate-800/60 pt-4 text-slate-400">
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="text-slate-200 font-medium">{doc.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact:</span>
                    <span className="text-slate-200 font-medium">{doc.user.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consultation:</span>
                    <span className="text-brand-400 font-semibold">{doc.consultationDurationMins} minutes</span>
                  </div>
                </div>

                {/* Shift agenda preview */}
                <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-slate-400" /> Weekly Availability Shifts
                  </h5>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {weekdays.map((day, idx) => {
                      const hasShift = doc.availabilities?.some((a: any) => a.dayOfWeek === idx);
                      return (
                        <div key={day} className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-500 font-semibold">{day[0]}</span>
                          <span className={`h-2 w-2 rounded-full mt-1 ${hasShift ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action operations */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => openAvailability(doc)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-slate-800 hover:bg-slate-900/60 text-slate-300 rounded-lg py-2 text-xs font-semibold transition"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Edit Shifts
                </button>
                <button
                  onClick={() => setShowLeaveModal(doc)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-slate-800 hover:bg-slate-900/60 text-slate-300 rounded-lg py-2 text-xs font-semibold transition"
                >
                  <CalendarRange className="h-3.5 w-3.5" /> Apply Leave
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onboard Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-6">Onboard New Doctor</h3>

            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Doctor Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Abhishek"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@clinic.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contact number"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Specialization / Department</label>
                <input
                  type="text"
                  required
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiologist, Orthopedic"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Consultation Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={consultationDurationMins}
                    onChange={(e) => setConsultationDurationMins(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Temporary password"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={clearAddForm}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shifts Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-card rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">Edit Shifts</h3>
            <p className="text-xs text-slate-400 mb-6">
              Configure working shifts for Dr. <span className="text-brand-400 font-semibold">{showAvailabilityModal.user.name}</span>
            </p>

            <form onSubmit={handleSaveAvailability} className="space-y-4">
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {availabilitiesForm.map((item, idx) => (
                  <div key={item.dayOfWeek} className="flex items-center justify-between gap-4 p-2 bg-slate-900/35 border border-slate-850 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleDayAvailability(idx)}
                        className="h-4 w-4 bg-slate-900 border-slate-800 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-semibold text-slate-300 w-20">{weekdays[item.dayOfWeek]}</span>
                    </div>

                    {item.enabled && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={item.startTime}
                          onChange={(e) => updateTimeAvailability(idx, 'startTime', e.target.value)}
                          placeholder="09:00"
                          className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                        />
                        <span className="text-[10px] text-slate-500">to</span>
                        <input
                          type="text"
                          required
                          value={item.endTime}
                          onChange={(e) => updateTimeAvailability(idx, 'endTime', e.target.value)}
                          placeholder="17:00"
                          className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(null)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Save Shifts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">Apply Leave Log</h3>
            <p className="text-xs text-slate-400 mb-6">
              Blocks booking calendar slots during leave window for Dr. <span className="text-brand-400 font-semibold">{showLeaveModal.user.name}</span>
            </p>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Reason</label>
                <input
                  type="text"
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Annual Medical Conference"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(null)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Save Leave Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
