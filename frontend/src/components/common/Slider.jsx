import React, { useState, useEffect, useRef } from 'react';

/**
 * Slider component for numeric input with custom styling
 */
const Slider = ({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  vertical = false,
  showTooltip = true,
  showValue = true,
  disabled = false,
  label = '',
  className = '',
  trackClassName = '',
  thumbClassName = '',
  valueFormatter = (value) => value,
  ...props
}) => {
  // Use controlled or uncontrolled state
  const [internalValue, setInternalValue] = useState(
    value !== undefined ? value : defaultValue || min
  );
  
  // Track refs for calculations
  const trackRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [showTooltipValue, setShowTooltipValue] = useState(false);
  
  // Update internal value when controlled value changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);
  
  // Calculate percentage for styling and tooltips
  const getPercentage = (value) => {
    return ((value - min) / (max - min)) * 100;
  };
  
  // Handle slider change
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setInternalValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }
  };
  
  // Handle mouse events for tooltip
  const handleMouseEnter = () => {
    setShowTooltipValue(true);
  };
  
  const handleMouseLeave = () => {
    setShowTooltipValue(false);
  };
  
  const handleMouseMove = (e) => {
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const position = vertical
        ? ((e.clientY - rect.top) / rect.height) * 100
        : ((e.clientX - rect.left) / rect.width) * 100;
      
      setTooltipPosition(position);
    }
  };
  
  // Calculate background style for track fill
  const trackFillStyle = {
    background: `linear-gradient(${vertical ? 'to top' : 'to right'}, 
                  #3B82F6 0%, #3B82F6 ${getPercentage(internalValue)}%, 
                  #4B5563 ${getPercentage(internalValue)}%, #4B5563 100%)`
  };
  
  // Tooltip positioning
  const tooltipStyle = {
    left: vertical ? '100%' : `${getPercentage(internalValue)}%`,
    top: vertical ? `${getPercentage(internalValue)}%` : '-30px',
    transform: vertical ? 'translateY(-50%)' : 'translateX(-50%)',
    opacity: showTooltipValue && showTooltip ? 1 : 0
  };
  
  return (
    <div className={`slider-container ${vertical ? 'h-32' : 'w-full'} ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-300">{label}</label>
          {showValue && (
            <span className="text-sm text-gray-400">{valueFormatter(internalValue)}</span>
          )}
        </div>
      )}
      
      <div 
        className={`relative ${vertical ? 'h-full' : 'w-full'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        ref={trackRef}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={internalValue}
          onChange={handleChange}
          disabled={disabled}
          className={`
            appearance-none bg-transparent 
            ${vertical ? 'h-full w-2' : 'w-full h-2'} 
            rounded cursor-pointer
            focus:outline-none
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${trackClassName}
          `}
          style={trackFillStyle}
          orient={vertical ? 'vertical' : 'horizontal'}
          {...props}
        />
        
        {/* Styled thumb */}
        <div 
          className={`absolute pointer-events-none w-4 h-4 bg-white rounded-full shadow
            ${thumbClassName}`}
          style={{
            left: vertical ? '50%' : `calc(${getPercentage(internalValue)}% - 8px)`,
            top: vertical ? `calc(${getPercentage(internalValue)}% - 8px)` : '50%',
            transform: vertical ? 'translate(-50%, -50%)' : 'translateY(-50%)',
            display: disabled ? 'none' : 'block'
          }}
        />
        
        {/* Tooltip */}
        {showTooltip && (
          <div 
            className="absolute bg-gray-800 text-white py-1 px-2 rounded text-xs"
            style={tooltipStyle}
          >
            {valueFormatter(internalValue)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Slider;