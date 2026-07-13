import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Calendar as CalendarIcon, Clock, ArrowRightLeft, XCircle, Activity, Plus } from 'lucide-react';

export default function Dashboard() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  
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
      // Acquire Redis Lock first (simulating the client lock sequence)
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
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    }
  };

  // Fetch slots for rescheduling date
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
    <div className="space-y-6">
      {/* Upper Control Bar */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {slots.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-500 text-sm glass p-8 rounded-xl">
              No shifts or availabilities configured for Dr. {doctors.find(d => d.id === selectedDoctorId)?.user?.name} on this weekday.
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

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative">
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
          <div className="w-full max-w-lg glass-card rounded-2xl p-6 relative">
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
