import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Megaphone, Play, Plus, RefreshCw, Settings, ShieldAlert, CheckCircle, Tag, Users } from 'lucide-react';

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'rules'>('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [scanLoading, setScanLoading] = useState(false);
  const [newRuleModal, setNewRuleModal] = useState(false);
  const [newCampaignModal, setNewCampaignModal] = useState(false);

  // New Rule Form
  const [ruleName, setRuleName] = useState('');
  const [ruleTag, setRuleTag] = useState('Diabetes');
  const [daysSince, setDaysSince] = useState(30);
  const [noShowRecovery, setNoShowRecovery] = useState(false);

  // New Campaign Form
  const [campName, setCampName] = useState('');
  const [campType, setCampType] = useState('voice');
  const [campRuleId, setCampRuleId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const campData = await apiRequest('/campaigns');
      setCampaigns(campData);

      const rulesData = await apiRequest('/retention/rules');
      setRules(rulesData);

      const trigData = await apiRequest('/retention/triggers');
      setTriggers(trigData);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve campaign parameters.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiRequest('/retention/scan', { method: 'POST' });
      setSuccessMsg(`Scan completed! Identified ${res.triggersCreated} new patients requiring outreach follow-up.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Retention scan failed.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await apiRequest('/retention/rules', {
        method: 'POST',
        body: JSON.stringify({
          name: ruleName,
          conditionJson: {
            tag: ruleTag,
            daysSinceLastAppointment: Number(daysSince),
            noShowRecovery,
          },
          actionJson: {
            outreachChannel: 'voice',
          },
        }),
      });

      setSuccessMsg('Retention rule created successfully!');
      setNewRuleModal(false);
      setRuleName('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create retention rule.');
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const camp = await apiRequest('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: campName,
          type: campType,
          ruleId: campRuleId,
          startsAt: tomorrow.toISOString(),
          endsAt: nextWeek.toISOString(),
        }),
      });

      setSuccessMsg('Campaign drafted successfully! Launching campaign outreach...');
      setNewCampaignModal(false);
      setCampName('');

      // Auto execute draft campaign immediately for user-friendly flow
      await apiRequest(`/campaigns/${camp.id}/execute`, { method: 'POST' });
      
      setSuccessMsg('Campaign launched! Outbound AI voice agents have been queued to contact targeted patients.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to launch campaign.');
    }
  };

  const handleExecuteDirectly = async (id: string) => {
    setError('');
    setSuccessMsg('');
    try {
      await apiRequest(`/campaigns/${id}/execute`, { method: 'POST' });
      setSuccessMsg('Campaign outreach triggered! AI agents are dialing active patient lines.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute campaign.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-brand-500" />
            Niva AI Campaigns & Outreach
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create intelligent follow-up workflows, configure medical retention rules, and trigger automated AI outbound calls.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleScan}
            disabled={scanLoading}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition uppercase disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${scanLoading ? 'animate-spin' : ''}`} />
            Scan For Target Patients
          </button>

          <button
            onClick={() => {
              if (rules.length === 0) {
                alert('Please create a retention rule first.');
                return;
              }
              setCampRuleId(rules[0].id);
              setNewCampaignModal(true);
            }}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition uppercase"
          >
            <Plus className="h-4 w-4" />
            Launch Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition duration-150 ${
            activeTab === 'campaigns'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition duration-150 ${
            activeTab === 'rules'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Retention Rules & Triggers
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          <RefreshCw className="animate-spin h-5 w-5 text-brand-500 mr-2" />
          Retrieving Campaign Data...
        </div>
      ) : activeTab === 'campaigns' ? (
        /* Campaigns List */
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm glass p-8 rounded-xl">
              No outreach campaigns have been launched yet. Click "Launch Campaign" to trigger outbound engagements.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaigns.map((camp) => {
                const totalRuns = camp.runs?.length || 0;
                const completedRuns = camp.runs?.filter((r: any) => r.status === 'responded').length || 0;
                const conversionRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;

                return (
                  <div key={camp.id} className="glass-card p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                            camp.status === 'active' ? 'bg-brand-500/15 text-brand-400' :
                            camp.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {camp.status}
                          </span>
                          <h3 className="font-bold text-white text-base mt-2">{camp.name}</h3>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5 capitalize">
                          <Tag className="h-3 w-3 text-brand-500" />
                          {camp.type}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-800/60 my-4 text-center">
                        <div>
                          <div className="text-xs text-slate-400 font-medium">Outreach Sent</div>
                          <div className="text-xl font-bold text-white mt-1">{totalRuns}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium">Responded</div>
                          <div className="text-xl font-bold text-emerald-400 mt-1">{completedRuns}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium">Conversion</div>
                          <div className="text-xl font-bold text-brand-500 mt-1">{conversionRate}%</div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Targeting Rule:</span>
                          <span className="text-slate-200 font-medium">{camp.rule?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Outreach Started:</span>
                          <span className="text-slate-200">{new Date(camp.startsAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {camp.status === 'draft' && (
                      <button
                        onClick={() => handleExecuteDirectly(camp.id)}
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 text-xs font-bold tracking-wider uppercase transition"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Execute Outreach Campaign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Rules & Triggers Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* Rule Header */}
            <div className="glass-card p-6 rounded-xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Retention Rules</h3>
                <button
                  onClick={() => setNewRuleModal(true)}
                  className="p-1.5 bg-slate-900 border border-slate-800 text-brand-500 hover:text-brand-400 rounded-lg transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {rules.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-4 text-center">No rules configured.</div>
                ) : (
                  rules.map((rule) => {
                    const cond = rule.conditionJson;
                    return (
                      <div key={rule.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-xs text-white">{rule.name}</span>
                          <span className={`h-2 w-2 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-1">
                          {cond?.noShowRecovery ? (
                            <div>Type: Recent No-Show Recovery</div>
                          ) : (
                            <>
                              <div>Condition: Patients with tag "{cond?.tag}"</div>
                              <div>Interval: No appointment in {cond?.daysSinceLastAppointment} days</div>
                            </>
                          )}
                          <div className="text-brand-500 font-semibold mt-1">Outreach: Voice Call</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {/* Triggers Table */}
            <div className="glass-card rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800/80">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-brand-500" />
                  Generated Engagement Triggers
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-200">
                  <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Patient</th>
                      <th className="px-6 py-3.5">Rule Triggers</th>
                      <th className="px-6 py-3.5">Date Detected</th>
                      <th className="px-6 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {triggers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                          No patient triggers detected. Run a "Target Scan" above to locate matching cases.
                        </td>
                      </tr>
                    ) : (
                      triggers.map((trig) => (
                        <tr key={trig.id} className="hover:bg-slate-900/30">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{trig.patient?.name}</div>
                            <div className="text-[10px] text-slate-400">{trig.patient?.phone}</div>
                          </td>
                          <td className="px-6 py-4">{trig.rule?.name}</td>
                          <td className="px-6 py-4">{new Date(trig.triggeredAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                              trig.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                              trig.status === 'actioned' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {trig.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Rule Modal */}
      {newRuleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Settings className="h-5 w-5 text-brand-500" />
              Configure Retention Rule
            </h3>
            <p className="text-xs text-slate-400 mb-6">Set matching conditions to flag patient cohorts requiring clinical follow-ups.</p>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diabetes Chronic Follow-up"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Target Patient Tag</label>
                  <select
                    value={ruleTag}
                    onChange={(e) => setRuleTag(e.target.value)}
                    disabled={noShowRecovery}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  >
                    <option value="Diabetes">Diabetes</option>
                    <option value="Hypertension">Hypertension</option>
                    <option value="Thyroid">Thyroid</option>
                    <option value="Pregnancy">Pregnancy</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                </div>

                <div className="w-32 space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Days Since Visit</label>
                  <input
                    type="number"
                    disabled={noShowRecovery}
                    value={daysSince}
                    onChange={(e) => setDaysSince(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="noShow"
                  checked={noShowRecovery}
                  onChange={(e) => setNoShowRecovery(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-brand-500 focus:ring-brand-500 h-4 w-4"
                />
                <label htmlFor="noShow" className="text-xs text-slate-300 font-medium">
                  Trigger on recent missed appointments (No-Show Recovery)
                </label>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setNewRuleModal(false)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg py-2.5 text-xs font-bold transition uppercase"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 text-xs font-bold transition uppercase"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {newCampaignModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-brand-500" />
              Launch Outreach Campaign
            </h3>
            <p className="text-xs text-slate-400 mb-6">Launch voice agents or notifications to contact rule-triggered cohorts.</p>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Diabetes Call Campaign"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Select Target Rule</label>
                <select
                  required
                  value={campRuleId}
                  onChange={(e) => setCampRuleId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  {rules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Outreach Channel</label>
                <select
                  value={campType}
                  onChange={(e) => setCampType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="voice">Niva Conversational AI Outbound Call</option>
                  <option value="whatsapp">WhatsApp Interactive Template</option>
                  <option value="sms">SMS Quick Alert</option>
                </select>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setNewCampaignModal(false)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg py-2.5 text-xs font-bold transition uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 text-xs font-bold transition uppercase"
                >
                  Launch Immediately
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
