import React from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import './HealthCard.css';

const HealthCard = ({ title, value, unit, icon, trend, status, color }) => {
  const getTrendIcon = () => {
    if (trend === 'stable') return <FiMinus />;
    if (trend.includes('+')) return <FiTrendingUp />;
    if (trend.includes('-')) return <FiTrendingDown />;
    return null;
  };

  return (
    <motion.div 
      className="health-card"
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="card-header">
        <div className="card-icon" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <span className={`card-trend ${trend === 'stable' ? 'stable' : trend.includes('+') ? 'up' : 'down'}`}>
          {getTrendIcon()}
          <span>{trend}</span>
        </span>
      </div>
      
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <div className="card-value">
          <span className="value">{value}</span>
          <span className="unit">{unit}</span>
        </div>
      </div>
      
      <div className="card-footer">
        <div className="status-indicator">
          <span className={`status-dot ${status}`}></span>
          <span className="status-text">{status}</span>
        </div>
        <button className="card-action">Details →</button>
      </div>
    </motion.div>
  );
};

export default HealthCard;
