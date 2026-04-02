import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './HealthChart.css';

const HealthChart = () => {
  const data = [
    { day: 'Mon', heartRate: 72, bloodPressure: 120, steps: 8000 },
    { day: 'Tue', heartRate: 74, bloodPressure: 118, steps: 10000 },
    { day: 'Wed', heartRate: 71, bloodPressure: 121, steps: 7500 },
    { day: 'Thu', heartRate: 73, bloodPressure: 119, steps: 9000 },
    { day: 'Fri', heartRate: 75, bloodPressure: 122, steps: 11000 },
    { day: 'Sat', heartRate: 72, bloodPressure: 120, steps: 6000 },
    { day: 'Sun', heartRate: 70, bloodPressure: 118, steps: 8500 }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="tooltip-item">
              <span className="tooltip-dot" style={{ background: entry.color }}></span>
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-value">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-tabs">
        <button className="chart-tab active">Heart Rate</button>
        <button className="chart-tab">Blood Pressure</button>
        <button className="chart-tab">Activity</button>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHeart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="day" stroke="#71717a" />
          <YAxis stroke="#71717a" />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="heartRate" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorHeart)"
            strokeWidth={2}
            name="Heart Rate"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthChart;
