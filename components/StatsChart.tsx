
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Caption } from '../types';

interface StatsChartProps {
  captions: Caption[];
}

const StatsChart: React.FC<StatsChartProps> = ({ captions }) => {
  if (captions.length < 2) return null;

  const data = captions.map((c) => ({
    time: c.start.toFixed(1),
    wps: c.text.split(' ').length / (c.end - c.start)
  }));

  return (
    <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h3 className="font-bold text-white">Speech Density</h3>
           <p className="text-xs text-slate-500">Words per second across the video timeline</p>
        </div>
        <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] text-indigo-400 font-bold">
           AI ANALYTICS
        </div>
      </div>
      
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorWps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
              itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
              labelStyle={{ display: 'none' }}
            />
            <Area 
              type="monotone" 
              dataKey="wps" 
              stroke="#6366f1" 
              fillOpacity={1} 
              fill="url(#colorWps)" 
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsChart;
