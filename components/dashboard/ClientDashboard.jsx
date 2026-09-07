import React from 'react';

export function ClientDashboard({ project }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-900 text-white rounded-xl">
      <div className="col-span-3 bg-slate-800 p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold">Live Project Phase & Timeline Tracker</h2>
        <p className="text-slate-400">Current Phase: {project.currentPhase}</p>
        <div className="w-full bg-slate-700 h-4 rounded-full mt-2">
          <div className="bg-blue-500 h-4 rounded-full" style={{ width: \\%\ }}></div>
        </div>
      </div>
      
      <div className="bg-slate-800 p-4 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-2">Automated Q&A</h3>
        <p className="text-sm text-slate-300">Phase-verified answers loaded for: {project.currentPhase}</p>
      </div>

      <div className="col-span-2 bg-slate-800 p-4 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-2">Technical Transparency Panel</h3>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>ASTM F1869 Moisture Threshold: &lt; 3 lbs / 1,000 sq. ft.</li>
          <li>Surface Prep Standard: SSPC/NACE compliant.</li>
          <li>Curing Status: {project.cureStatus}</li>
        </ul>
      </div>
    </div>
  );
}
