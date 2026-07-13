import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import { Phone, PhoneCall, PhoneOff, PlayCircle, RefreshCw, MessageSquare, User, Activity } from 'lucide-react';

export default function VoiceComms() {
  const [calls, setCalls] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Simulator modal state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [messages, setMessages] = useState<{ speaker: 'patient' | 'niva'; text: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  
  // Call detailed view state
  const [detailedCall, setDetailedCall] = useState<any>(null);

  const dialogEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCalls();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (dialogEndRef.current) {
      dialogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/voice-calls');
      setCalls(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await apiRequest('/patients?limit=50');
      setPatients(data.patients);
    } catch (err) {
      // Ignored
    }
  };

  const handleStartCall = async (patientId: string) => {
    setSimulatorOpen(true);
    setSimLoading(true);
    setMessages([]);
    try {
      // 1. Initialize simulated call record
      const call = await apiRequest('/voice-calls/simulate', {
        method: 'POST',
        body: JSON.stringify({ patientId }),
      });
      setCurrentCall(call);

      // 2. Trigger first agent message (Niva greeting)
      const res = await apiRequest(`/voice-calls/${call.id}/interact`, {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }), // Dummy message to trigger prompt
      });

      setMessages([{ speaker: 'niva', text: res.agentResponse }]);
    } catch (err: any) {
      alert(err.message || 'Failed to establish call connection.');
      setSimulatorOpen(false);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentCall) return;

    const userText = inputText.trim();
    setMessages((prev) => [...prev, { speaker: 'patient', text: userText }]);
    setInputText('');
    setSimLoading(true);

    try {
      const res = await apiRequest(`/voice-calls/${currentCall.id}/interact`, {
        method: 'POST',
        body: JSON.stringify({ message: userText }),
      });

      setMessages((prev) => [...prev, { speaker: 'niva', text: res.agentResponse }]);
      
      if (res.status === 'completed') {
        // Automatically refresh call list and show success if booked
        if (res.appointmentBooked) {
          setTimeout(() => alert('AI Agent booked the appointment successfully!'), 500);
        }
        fetchCalls();
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { speaker: 'niva', text: 'Sorry, my voice synthesizer lost connection momentarily.' }]);
    } finally {
      setSimLoading(false);
    }
  };

  const handleEndCall = () => {
    setSimulatorOpen(false);
    setCurrentCall(null);
    setMessages([]);
    fetchCalls();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left panel: Call list log */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-card p-6 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-brand-500" />
              Niva AI Outbound Call Log
            </h2>
            <p className="text-xs text-slate-400 mt-1">Verify dynamic transcription summaries and patient compliance rates.</p>
          </div>
          <button
            onClick={fetchCalls}
            className="p-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            <RefreshCw className="animate-spin h-5 w-5 text-brand-500 mr-2" />
            Loading call registries...
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm glass p-8 rounded-xl">
            No voice logs found. Dial a patient profile using the simulator.
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <button
                key={call.id}
                onClick={() => setDetailedCall(call)}
                className={`w-full text-left glass-card p-4 rounded-xl border transition flex items-center justify-between hover:border-brand-500 ${
                  detailedCall?.id === call.id ? 'border-brand-500 bg-brand-500/5' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Phone className={`h-4 w-4 ${call.status === 'completed' ? 'text-emerald-500' : 'text-brand-500 animate-pulse'}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{call.patient?.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{call.patient?.phone}</span>
                      <span>•</span>
                      <span className="capitalize">{call.direction}</span>
                      <span>•</span>
                      <span className="capitalize">{call.patient?.preferredLanguage}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    call.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-brand-500/15 text-brand-400'
                  }`}>
                    {call.status}
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    {call.durationSecs ? `${call.durationSecs} secs` : '--'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right panel: Simulator triggers & detail card */}
      <div className="lg:col-span-1 space-y-6">
        {/* Call Simulator launcher */}
        <div className="glass-card p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
            <PlayCircle className="h-4 w-4 text-brand-500" />
            AI Voice Dialer Simulator
          </h3>
          <p className="text-xs text-slate-400">Launch a mock voice outreach call to test Niva's conversational engine.</p>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {patients.map((pat) => (
              <div key={pat.id} className="flex justify-between items-center p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <div>
                  <div className="font-semibold text-xs text-white">{pat.name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{pat.preferredLanguage}</div>
                </div>
                <button
                  onClick={() => handleStartCall(pat.id)}
                  className="flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition"
                >
                  <Phone className="h-3 w-3" />
                  Call Patient
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Transcript Summary Card */}
        {detailedCall && (
          <div className="glass-card p-6 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Clinical Dialog Details</h3>
              <button onClick={() => setDetailedCall(null)} className="text-xs text-slate-500 hover:text-slate-300">Close</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg">
                <div className="font-semibold text-white mb-1">AI Outreach Summary</div>
                <p className="text-slate-400 leading-relaxed text-[11px]">{detailedCall.aiSummary || 'No summary available.'}</p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg">
                <div className="font-semibold text-white mb-2 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-brand-500" /> Transcription
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 text-[11px] pr-1">
                  {detailedCall.transcript ? (
                    detailedCall.transcript.split('\n').map((line: string, idx: number) => {
                      const isNiva = line.startsWith('Niva');
                      return (
                        <div key={idx} className="leading-relaxed">
                          <span className={`font-semibold ${isNiva ? 'text-brand-400' : 'text-slate-200'}`}>
                            {isNiva ? 'Niva: ' : 'Patient: '}
                          </span>
                          <span className="text-slate-400">{line.replace(/^(Niva|Patient):\s*/, '')}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500 italic">No conversation log available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialer Simulator Modal */}
      {simulatorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col h-[550px]">
            {/* Phone simulator header */}
            <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/30">
                  <User className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{currentCall?.patient?.name || 'Connecting...'}</div>
                  <div className="text-[10px] text-brand-500 font-semibold tracking-wider uppercase animate-pulse flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Call Connected (Niva AI)
                  </div>
                </div>
              </div>
              <button
                onClick={handleEndCall}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full transition"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>

            {/* Conversation Dialog Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/30">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.speaker === 'patient' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                      msg.speaker === 'patient'
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {simLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 rounded-bl-none text-xs text-slate-400 flex items-center gap-1.5">
                    <RefreshCw className="animate-spin h-3.5 w-3.5 text-brand-500" />
                    Niva is speaking...
                  </div>
                </div>
              )}
              <div ref={dialogEndRef} />
            </div>

            {/* Input message form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                disabled={simLoading || !currentCall}
                placeholder="Speak (type) to Niva agent..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={simLoading || !inputText.trim()}
                className="bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-4 text-xs font-bold transition uppercase disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
