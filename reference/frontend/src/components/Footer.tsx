import React from 'react';
import { HeartHandshake, Code2, Server } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-slate-950 border-t border-slate-900 text-slate-400 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
            <HeartHandshake className="w-5 h-5 text-rose-500" />
            <span>DonateConnect</span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-500 font-normal">Full-Stack Application Scaffold</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Spring Boot 3.4 + Java 21</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>React 18 + Vite + TS</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Created with Antigravity AI &bull; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
};
