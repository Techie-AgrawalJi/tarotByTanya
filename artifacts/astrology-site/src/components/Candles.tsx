import React from "react";

export function Candles() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 candles-wrapper">
      <div className="candles-left">
        <div className="candle">
          <div className="wax" />
          <div className="flame" />
        </div>
        <div className="candle small">
          <div className="wax" />
          <div className="flame" />
        </div>
      </div>
      <div className="candles-right">
        <div className="candle">
          <div className="wax" />
          <div className="flame" />
        </div>
      </div>
    </div>
  );
}

export default Candles;
