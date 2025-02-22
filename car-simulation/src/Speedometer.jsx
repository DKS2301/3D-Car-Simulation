import React, { useState, useEffect } from "react";

const SpeedometerDisplay = ({ speed }) => {
  const maxSpeed = 200; // Maximum speed
  const minRotation = -90; // Needle starting position
  const maxRotation = 90; // Maximum rotation

  const [needleRotation, setNeedleRotation] = useState(minRotation);

  useEffect(() => {
    const clampedSpeed = Math.max(0, Math.min(speed, maxSpeed)); // Prevent invalid speeds
    const newRotation = minRotation + (clampedSpeed / maxSpeed) * (maxRotation - minRotation);
    
    setNeedleRotation(newRotation);
  }, [speed]); // Update rotation when speed changes

  return (
    <div id="speedometer">
      <div className="speedometer-inner">
        {/* Rotating Needle */}
        <div className="speedometer-needle" style={{ transform: `rotate(${needleRotation}deg)` }}></div>

        {/* Speed Text */}
        <div className="speedometer-text">
          {Math.round(speed)} km/h
        </div>
      </div>
    </div>
  );
};

export default SpeedometerDisplay;
