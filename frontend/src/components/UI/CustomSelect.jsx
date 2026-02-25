import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

export const CustomSelect = ({ options, value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close when clicking outside or scrolling
  useEffect(() => {
    const handleGlobalClick = (event) => {
      // Check if click is inside the trigger OR the dropdown content
      if (
        (triggerRef.current && triggerRef.current.contains(event.target)) ||
        (dropdownRef.current && dropdownRef.current.contains(event.target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleScroll = (event) => {
      // Allow scrolling inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleGlobalClick);
      document.addEventListener('scroll', handleScroll, true); // Capture scroll events
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4, // 4px gap
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="custom-select-container">
      {label && <label className="custom-select-label">{label}</label>}
      
      <div 
        ref={triggerRef}
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`} 
        onClick={toggleOpen}
      >
        <span>{typeof value === 'object' ? value.name : value}</span>
        <ChevronDown size={20} className={`arrow ${isOpen ? 'rotated' : ''}`} />
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="custom-select-options"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
          }}
        >
          {options.map((option) => (
            <div 
              key={option.id} 
              className={`custom-option ${typeof value === 'object' && option.id === value.id ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(option);
              }}
            >
              <span>{option.name}</span>
              {typeof value === 'object' && option.id === value.id && <Check size={16} className="check-icon" />}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
