import React, { useState, useRef, useEffect } from 'react';

/**
 * Tooltip component that displays a small popover when hovering over content
 */
const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 300,
  className = '',
  arrow = true,
  maxWidth = 200,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const targetRef = useRef(null);
  const timeoutRef = useRef(null);
  
  // Calculate position when visibility changes or on resize
  useEffect(() => {
    if (isVisible && targetRef.current && tooltipRef.current) {
      updatePosition();
    }
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isVisible, position]);
  
  // Calculate tooltip position
  const updatePosition = () => {
    if (!targetRef.current || !tooltipRef.current) return;
    
    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    
    let top = 0;
    let left = 0;
    
    // Calculate position based on requested position
    switch (position) {
      case 'top':
        top = targetRect.top + scrollTop - tooltipRect.height - 8;
        left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + scrollTop + 8;
        left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.left + scrollLeft - tooltipRect.width - 8;
        break;
      case 'right':
        top = targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.right + scrollLeft + 8;
        break;
      default:
        top = targetRect.top + scrollTop - tooltipRect.height - 8;
        left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2);
    }
    
    // Ensure tooltip stays within viewport
    const viewport = {
      top: scrollTop,
      left: scrollLeft,
      right: scrollLeft + window.innerWidth,
      bottom: scrollTop + window.innerHeight
    };
    
    if (left < viewport.left + 10) {
      left = viewport.left + 10;
    } else if (left + tooltipRect.width > viewport.right - 10) {
      left = viewport.right - tooltipRect.width - 10;
    }
    
    if (top < viewport.top + 10) {
      if (position === 'top') {
        // Flip to bottom
        top = targetRect.bottom + scrollTop + 8;
      } else {
        top = viewport.top + 10;
      }
    } else if (top + tooltipRect.height > viewport.bottom - 10) {
      if (position === 'bottom') {
        // Flip to top
        top = targetRect.top + scrollTop - tooltipRect.height - 8;
      } else {
        top = viewport.bottom - tooltipRect.height - 10;
      }
    }
    
    // Update state
    setTooltipPosition({ top, left });
  };
  
  // Show tooltip with delay
  const showTooltip = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };
  
  // Hide tooltip
  const hideTooltip = () => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Get arrow styles based on position
  const getArrowStyle = () => {
    switch (position) {
      case 'top':
        return {
          bottom: '-4px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          borderRight: '1px solid #4B5563',
          borderBottom: '1px solid #4B5563'
        };
      case 'bottom':
        return {
          top: '-4px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          borderTop: '1px solid #4B5563',
          borderLeft: '1px solid #4B5563'
        };
      case 'left':
        return {
          right: '-4px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          borderTop: '1px solid #4B5563',
          borderRight: '1px solid #4B5563'
        };
      case 'right':
        return {
          left: '-4px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          borderBottom: '1px solid #4B5563',
          borderLeft: '1px solid #4B5563'
        };
      default:
        return {};
    }
  };
  
  return (
    <div 
      className="inline-flex relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      ref={targetRef}
      {...props}
    >
      {children}
      
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 text-white text-sm bg-gray-800 
            px-2 py-1 rounded shadow-lg border border-gray-700
            ${className}
          `}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth: maxWidth,
            pointerEvents: 'none',
            position: 'fixed'
          }}
          role="tooltip"
        >
          {/* Arrow */}
          {arrow && (
            <div
              className="absolute w-2 h-2 bg-gray-800"
              style={getArrowStyle()}
            />
          )}
          
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;