import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

/**
 * Select component with custom styling and enhanced functionality
 */
const Select = ({
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  label = '',
  error = '',
  disabled = false,
  searchable = false,
  clearable = false,
  multiple = false,
  className = '',
  optionClassName = '',
  ...props
}) => {
  // Use controlled or uncontrolled state
  const [selectedValue, setSelectedValue] = useState(
    value !== undefined ? value : defaultValue || (multiple ? [] : '')
  );
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // Update internal value when controlled value changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);
  
  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      
      // Clear search term when opening
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };
  
  // Handle option selection
  const handleSelect = (option) => {
    if (multiple) {
      const newValue = selectedValue.includes(option.value)
        ? selectedValue.filter(val => val !== option.value)
        : [...selectedValue, option.value];
      
      setSelectedValue(newValue);
      
      if (onChange) {
        onChange(newValue);
      }
    } else {
      setSelectedValue(option.value);
      setIsOpen(false);
      
      if (onChange) {
        onChange(option.value);
      }
    }
  };
  
  // Clear selection
  const handleClear = (e) => {
    e.stopPropagation();
    
    const newValue = multiple ? [] : '';
    setSelectedValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }
  };
  
  // Handle search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Get filtered options based on search term
  const filteredOptions = searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;
  
  // Get display text
  const getDisplayText = () => {
    if (multiple) {
      if (selectedValue.length === 0) return placeholder;
      
      if (selectedValue.length === 1) {
        const option = options.find(opt => opt.value === selectedValue[0]);
        return option ? option.label : placeholder;
      }
      
      return `${selectedValue.length} selected`;
    }
    
    if (!selectedValue) return placeholder;
    
    const option = options.find(opt => opt.value === selectedValue);
    return option ? option.label : placeholder;
  };
  
  return (
    <div className={`select-container ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        {/* Selected value display */}
        <div
          className={`
            flex items-center justify-between 
            p-2 border rounded cursor-pointer
            ${isOpen ? 'border-blue-500' : 'border-gray-600'} 
            ${disabled ? 'bg-gray-700 opacity-60 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-650'}
            ${error ? 'border-red-500' : ''}
          `}
          onClick={toggleDropdown}
        >
          <div className="flex-grow truncate text-gray-200">
            {getDisplayText()}
          </div>
          
          <div className="flex items-center ml-2">
            {clearable && selectedValue && (selectedValue.length > 0 || selectedValue !== '') && (
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-gray-200"
                onClick={handleClear}
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            )}
            
            <ChevronDown 
              size={18} 
              className={`ml-1 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
            />
          </div>
        </div>
        
        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg">
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-gray-700">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full p-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            {/* Options list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-gray-400 text-center">No options found</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = multiple 
                    ? selectedValue.includes(option.value) 
                    : selectedValue === option.value;
                  
                  return (
                    <div
                      key={option.value}
                      className={`
                        p-2 cursor-pointer
                        ${isSelected ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'}
                        ${optionClassName}
                      `}
                      onClick={() => handleSelect(option)}
                    >
                      <div className="flex items-center">
                        {multiple && (
                          <div className={`mr-2 w-4 h-4 border ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500'} rounded flex items-center justify-center`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        )}
                        {option.label}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Select;