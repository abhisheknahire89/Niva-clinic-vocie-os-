import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Calendar, Users, BriefcaseMedical, Settings, LogOut, Activity } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background neon blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-brand-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-brand-700/5 blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-64 glass border-r border-slate-800/80 flex flex-col z-20">
        {/* Header/Logo */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <Activity className="h-6 w-6 text-brand-500 neon-text" />
          <span className="font-bold text-lg text-white">ClinicEngage <span className="text-brand-500">AI</span></span>
        </div>

        {/* User profile brief */}
        <div className="p-4 border-b border-slate-800/40 bg-slate-900/30 flex flex-col">
          <span className="text-sm font-semibold text-white truncate">{user?.name}</span>
          <span className="text-xs text-brand-500 font-medium truncate mt-0.5">{user?.role}</span>
          <span className="text-[10px] text-slate-500 truncate mt-1">{user?.clinic?.name}</span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition duration-150 ${
                isActive
                  ? 'bg-brand-500/10 border-l-2 border-brand-500 text-white shadow-inner shadow-brand-500/5'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
              }`
            }
          >
            <Calendar className="h-4 w-4" />
            Schedule Planner
          </NavLink>

          <NavLink
            to="/patients"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition duration-150 ${
                isActive
                  ? 'bg-brand-500/10 border-l-2 border-brand-500 text-white shadow-inner shadow-brand-500/5'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
              }`
            }
          >
            <Users className="h-4 w-4" />
            Patient Directory
          </NavLink>

          <NavLink
            to="/doctors"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition duration-150 ${
                isActive
                  ? 'bg-brand-500/10 border-l-2 border-brand-500 text-white shadow-inner shadow-brand-500/5'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
              }`
            }
          >
            <BriefcaseMedical className="h-4 w-4" />
            Doctor Directory
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition duration-150 ${
                isActive
                  ? 'bg-brand-500/10 border-l-2 border-brand-500 text-white shadow-inner shadow-brand-500/5'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
              }`
            }
          >
            <Settings className="h-4 w-4" />
            Clinic Settings
          </NavLink>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition duration-150"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto z-10">
        <header className="h-16 border-b border-slate-800/80 px-8 flex items-center justify-between glass">
          <h2 className="font-semibold text-lg text-white">Clinic Administration Panel</h2>
          <div className="text-xs text-slate-400">
            Timezone: <span className="text-brand-500 font-medium">{user?.clinic?.timezone || 'UTC'}</span>
          </div>
        </header>
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
