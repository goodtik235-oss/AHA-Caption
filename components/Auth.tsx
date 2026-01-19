
import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const Auth: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mx-auto mb-6 transform hover:rotate-6 transition-transform">
            <span className="font-bold text-4xl text-white">A</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">AHA Studio</h1>
          <p className="text-slate-400">The Ultimate AI Video Localization Platform</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl">
          <div className="flex items-center space-x-3 mb-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <ShieldCheck className="text-indigo-400" />
            <p className="text-sm text-indigo-100 font-medium">Demo Access - No account required</p>
          </div>

          <button 
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all active:scale-95 group"
            onClick={() => window.location.reload()}
          >
            <span>Start Creating</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
