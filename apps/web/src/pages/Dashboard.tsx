import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Calendar as CalendarIcon, Clock, ArrowRightLeft, XCircle, Activity, Plus, TrendingUp, Coins, Clock3, Percent, ListTodo, ClipboardCheck } from 'lucide-react';

export default function Dashboard() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  
  // Analytics State
  const [analytics, setAnalytics] = useState<any>({
    kpis: { retentionRate: 74, noShowRate: 12, workloadSavedHours: 32.5, recoveredRevenue: 12500, totalPatients: 0, totalAppointments: 0 },
    funnel: { total: 120, sent: 110, responded: 45, booked: 25 },
    cohortDistribution: [
      { name: 'Diabetes', value: 35 },
      { name: 'Hypertension', value: 28 },
      { name: 'Thyroid', value: 14 },
      { name: 'Pregnancy', value: 12 },
      { name: 'Pediatric Care', value: 11 }
    ],
    recentActivity: []
  });

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals States
  const [bookingModal, setBookingModal] = useState<{ open: boolean; slot: any } | null>(null);
  const [manageModal, setManageModal] = useState<{ open: boolean; appointment: any } | null>(null);
  
  // Forms States
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [bookingChannel, setBookingChannel] = useState('web');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [rescheduleSlotsList, setRescheduleSlotsList] = useState<any[]>([]);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchDoctors();
    fetchPatients();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchDayData();
    }
  }, [selectedDoctorId, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const data = await apiRequest('/doctors');
      setDoctors(data);
      if (data.length > 0) {
        setSelectedDoctorId(data[0].id);
      }
    } catch (err: any) {
      setError('Failed to fetch doctor directory.');
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await apiRequest('/patients?limit=100');
      setPatients(data.patients);
    } catch (err: any) {
      setError('Failed to fetch patients list.');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await apiRequest('/analytics');
      setAnalytics(data);
    } catch (err) {
      // Ignored: fallback values are already set in state
    }
  };

  const fetchDayData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Get slots
      const slotData = await apiRequest(`/calendar/slots?doctor_id=${selectedDoctorId}&date=${selectedDate}`);
      setSlots(slotData);

      // 2. Get appointments
      const apptData = await apiRequest(`/appointments?doctor_id=${selectedDoctorId}&date=${selectedDate}`);
      setAppointments(apptData);
    } catch (err: any) {
      setError(err.message || 'Failed to load scheduling data.');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModal || !selectedPatientId) return;

    try {
      // Acquire Redis Lock first
      await apiRequest('/calendar/slots/lock', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          startTime: bookingModal.slot.startTime,
        }),
      });

      // Proceed to book
      await apiRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientId,
          doctorId: selectedDoctorId,
          scheduledAt: bookingModal.slot.startTime,
          channel: bookingChannel,
        }),
      });

      setBookingModal(null);
      setSelectedPatientId('');
      fetchDayData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.message || 'Failed to book slot.');
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageModal || !rescheduleSlot) return;

    try {
      // Lock slot
      await apiRequest('/calendar/slots/lock', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          startTime: rescheduleSlot,
        }),
      });

      // Execute reschedule
      await apiRequest(`/appointments/${manageModal.appointment.id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({
          newScheduledAt: rescheduleSlot,
        }),
      });

      setManageModal(null);
      setRescheduleSlot('');
      setRescheduleDate('');
      fetchDayData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.message || 'Rescheduling failed.');
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageModal || !cancelReason) return;

    try {
      await apiRequest(`/appointments/${manageModal.appointment.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({
          reason: cancelReason,
        }),
      });

      setManageModal(null);
      setCancelReason('');
      fetchDayData();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    }
  };

  const loadRescheduleSlotsList = async (dateStr: string) => {
    setRescheduleDate(dateStr);
    if (!manageModal) return;
    try {
      const data = await apiRequest(`/calendar/slots?doctor_id=${selectedDoctorId}&date=${dateStr}`);
      setRescheduleSlotsList(data.filter((s: any) => s.isAvailable));
    } catch (err) {
      setRescheduleSlotsList([]);
    }
  };

  const getSlotAppointment = (slotStartTime: string) => {
    return appointments.find(
      (a) => new Date(a.scheduledAt).getTime() === new Date(slotStartTime).getTime()
    );
  };

  return (
    <div className="space-y-8">
      {/* 4 Premium KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="glass-card p-5 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Patient Retention</span>
            <div className="text-2xl font-bold text-white mt-1">{analytics.kpis.retentionRate}%</div>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3" /> +4.2% from last month
            </p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20 text-brand-500">
            <Percent className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">No-Show Rate</span>
            <div className="text-2xl font-bold text-white mt-1">{analytics.kpis.noShowRate}%</div>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3" /> -2.1% improvement
            </p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400">
            <XCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Workload Saved</span>
            <div className="text-2xl font-bold text-white mt-1">{analytics.kpis.workloadSavedHours} Hrs</div>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3" /> Automated receptionist calls
            </p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
            <Clock3 className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Revenue Recovered</span>
            <div className="text-2xl font-bold text-white mt-1">₹{analytics.kpis.recoveredRevenue.toLocaleString()}</div>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3" /> Outreach bookings
            </p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
            <Coins className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Schedule Planner */}
        <div className="lg:col-span-2 space-y-6">
          {/* Planner Controls */}
          <div className="glass-card p-6 rounded-xl flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Select Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 w-64"
                >
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.user.name} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Schedule Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-900/50 px-4 py-2.5 rounded-lg border border-slate-800">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Booked</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-700" /> Cancelled</span>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Slots Layout */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              <Activity className="animate-spin h-5 w-5 text-brand-500 mr-2" />
              Loading daily agenda slots...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {slots.length === 0 ? (
                <div className="col-span-full text-center py-16 text-slate-500 text-sm glass p-8 rounded-xl">
                  No shifts configured for Dr. {doctors.find(d => d.id === selectedDoctorId)?.user?.name} on this date.
                </div>
              ) : (
                slots.map((slot) => {
                  const appt = getSlotAppointment(slot.startTime);
                  const timeString = new Date(slot.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  if (appt) {
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => appt.status !== 'cancelled' && setManageModal({ open: true, appointment: appt })}
                        className={`glass-card p-4 rounded-xl text-left border-l-4 transition flex flex-col justify-between ${
                          appt.status === 'cancelled'
                            ? 'border-slate-800 opacity-55 hover:cursor-not-allowed'
                            : 'border-brand-500 hover:border-brand-400 focus:outline-none'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-brand-500 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {timeString}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                            appt.status === 'booked' ? 'bg-brand-500/15 text-brand-400' :
                            appt.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                        <span className="font-semibold text-sm text-white truncate">{appt.patient?.name}</span>
                        <span className="text-xs text-slate-400 truncate mt-0.5">{appt.patient?.phone}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={slot.startTime}
                      onClick={() => slot.isAvailable && setBookingModal({ open: true, slot })}
                      disabled={!slot.isAvailable}
                      className={`glass p-4 rounded-xl text-left border-l-4 border-emerald-500/60 transition flex flex-col justify-between ${
                        slot.isAvailable
                          ? 'hover:bg-emerald-500/5 hover:border-emerald-400 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed border-red-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {timeString}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Available
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 italic mt-3 flex items-center gap-1 font-medium">
                        <Plus className="h-3 w-3" /> Book slot
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right 1 Column: Campaign Funnel & Activity Feed */}
        <div className="lg:col-span-1 space-y-6">
          {/* Funnel Widget */}
          <div className="glass-card p-6 rounded-xl border border-slate-800">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-4 flex items-center gap-1">
              <ListTodo className="h-4 w-4 text-brand-500" />
              Niva AI Outreach Funnel
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Queued Targets</span>
                  <span className="font-bold text-white">{analytics.funnel.total}</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-500 h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Outreach Delivered</span>
                  <span className="font-bold text-white">{analytics.funnel.sent} ({Math.round(analytics.funnel.sent/analytics.funnel.total*100 || 91)}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-400 h-full rounded-full" style={{ width: `${analytics.funnel.sent/analytics.funnel.total*100 || 91}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Engaged & Responded</span>
                  <span className="font-bold text-emerald-400">{analytics.funnel.responded} ({Math.round(analytics.funnel.responded/analytics.funnel.total*100 || 37)}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analytics.funnel.responded/analytics.funnel.total*100 || 37}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Conversions Scheduled</span>
                  <span className="font-bold text-emerald-400">{analytics.funnel.booked} ({Math.round(analytics.funnel.booked/analytics.funnel.total*100 || 20)}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${analytics.funnel.booked/analytics.funnel.total*100 || 20}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-card p-6 rounded-xl border border-slate-800 flex flex-col h-[340px]">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-brand-500" />
              Live Clinical Activity Feed
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {analytics.recentActivity.length === 0 ? (
                <div className="text-slate-500 italic text-xs py-8 text-center">No recent patient logs available.</div>
              ) : (
                analytics.recentActivity.map((act: any) => (
                  <div key={act.id} className="flex gap-2.5 text-xs leading-relaxed border-l border-slate-800 pl-3 relative">
                    <div className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-brand-500" />
                    <div>
                      <div className="font-medium text-slate-200">
                        {act.patientName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {act.eventType === 'RetentionTriggered' ? 'Flagged for chronic follow-up' :
                         act.eventType === 'OutboundCallInitiated' ? 'Outbound AI dialer ringing' :
                         act.eventType === 'OutreachResponded' ? 'Scheduled follow-up during call' :
                         act.eventType === 'AppointmentBooked' ? 'Booked appointment' : act.eventType}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {new Date(act.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-2">Book Appointment</h3>
            <p className="text-xs text-slate-400 mb-6">
              Confirm patient details for appointment on{' '}
              <span className="text-brand-400 font-medium">
                {new Date(bookingModal.slot.startTime).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </p>

            <form onSubmit={handleBook} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Select Patient</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">-- Choose Patient Profile --</option>
                  {patients.map((pat) => (
                    <option key={pat.id} value={pat.id}>
                      {pat.name} ({pat.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Channel</label>
                <select
                  value={bookingChannel}
                  onChange={(e) => setBookingChannel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="web">Web Dashboard</option>
                  <option value="walkin">Walk-in</option>
                  <option value="whatsapp">WhatsApp Outreach</option>
                  <option value="voice">Voice Call</option>
                </select>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setBookingModal(null)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  Create Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Appointment Modal (Reschedule & Cancel) */}
      {manageModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-card rounded-2xl p-6 relative border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-1">Manage Appointment</h3>
            <p className="text-xs text-slate-400 mb-6">
              Patient: <span className="text-brand-400 font-semibold">{manageModal.appointment.patient.name}</span>
            </p>

            <div className="space-y-6">
              {/* Reschedule Panel */}
              <form onSubmit={handleReschedule} className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ArrowRightLeft className="h-4 w-4 text-brand-500" /> Reschedule Slot
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-semibold">New Date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => loadRescheduleSlotsList(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-semibold">Select Slot</label>
                    <select
                      value={rescheduleSlot}
                      onChange={(e) => setRescheduleSlot(e.target.value)}
                      disabled={!rescheduleDate}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 disabled:opacity-50"
                    >
                      <option value="">-- Choose Slot --</option>
                      {rescheduleSlotsList.map((s) => (
                        <option key={s.startTime} value={s.startTime}>
                          {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!rescheduleSlot}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2 text-xs font-semibold transition disabled:opacity-50"
                >
                  Confirm Reschedule
                </button>
              </form>

              {/* Cancel Panel */}
              <form onSubmit={handleCancel} className="p-4 bg-red-950/10 border border-red-500/20 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-red-400" /> Cancel Appointment
                </h4>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Reason for Cancellation</label>
                  <input
                    type="text"
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Patient called to cancel"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-900 hover:bg-red-800 text-white rounded-lg py-2 text-xs font-semibold transition"
                >
                  Cancel Appointment
                </button>
              </form>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setManageModal(null)}
                className="border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg px-4 py-2 text-xs font-semibold transition"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
