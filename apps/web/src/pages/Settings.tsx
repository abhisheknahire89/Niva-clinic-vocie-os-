import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Stethoscope, Globe, Phone, MapPin, Save, Loader2 } from 'lucide-react';

export default function Settings() {
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClinicProfile();
  }, []);

  const fetchClinicProfile = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/clinics/profile');
      setName(data.name);
      setTimezone(data.timezone);
      setPhone(data.phone);
      setAddress(data.address);
    } catch (err: any) {
      setError('Failed to fetch clinic settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      await apiRequest('/clinics/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, timezone, phone, address }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Saving clinic settings failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500 text-center py-20 text-sm">Loading settings profile...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-card p-6 rounded-xl">
        <h3 className="font-bold text-white text-lg">Clinic Profile Settings</h3>
        <p className="text-xs text-slate-400">Configure clinic metadata details, locations, and timings</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">
          Settings profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="glass-card p-6 rounded-xl space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-semibold">Clinic Name</label>
          <div className="relative">
            <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold">Timezone</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold">Contact Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-semibold">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800/40">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
