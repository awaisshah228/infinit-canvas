import { memo, useCallback, useState } from 'react';
import { useReactFlow } from '../../hooks/index.js';
import { useCanvasStore } from '../../context/InfiniteCanvasContext.js';

// ── SVG Icons ────────────────────────────────────────────────────
function ZoomInIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FitViewIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

// ── ControlButton ────────────────────────────────────────────────
export function ControlButton({ children, className = '', ...props }) {
  return (
    <button
      className={`ric-controls-button ${className}`}
      style={btnStyle}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Controls ─────────────────────────────────────────────────────
function Controls({
  showZoom = true,
  showFitView = true,
  showInteractive = false,
  fitViewOptions,
  onZoomIn,
  onZoomOut,
  onFitView,
  onInteractiveChange,
  position = 'bottom-left',
  orientation = 'vertical',
  style = {},
  className = '',
  'aria-label': ariaLabel = 'Canvas controls',
  children,
}) {
  const store = useCanvasStore();
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [isInteractive, setIsInteractive] = useState(true);

  const isMinZoom = getZoom() <= store.zoomMin;
  const isMaxZoom = getZoom() >= store.zoomMax;

  const handleZoomIn = useCallback(() => {
    zoomIn();
    onZoomIn?.();
  }, [zoomIn, onZoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
    onZoomOut?.();
  }, [zoomOut, onZoomOut]);

  const handleFitView = useCallback(() => {
    fitView(fitViewOptions || { padding: 0.1 });
    onFitView?.();
  }, [fitView, fitViewOptions, onFitView]);

  const handleInteractiveToggle = useCallback(() => {
    const next = !isInteractive;
    setIsInteractive(next);
    onInteractiveChange?.(next);
  }, [isInteractive, onInteractiveChange]);

  const posStyle = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'top-center': { top: 10, left: '50%', transform: 'translateX(-50%)' },
    'bottom-left': { bottom: 30, left: 10 },
    'bottom-right': { bottom: 30, right: 10 },
    'bottom-center': { bottom: 30, left: '50%', transform: 'translateX(-50%)' },
  }[position] || { bottom: 30, left: 10 };

  return (
    <div
      className={`ric-controls ${className}`}
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
        gap: 2,
        zIndex: 5,
        ...posStyle,
        ...style,
      }}
      role="toolbar"
      aria-label={ariaLabel}
    >
      {showZoom && (
        <>
          <ControlButton
            onClick={handleZoomIn}
            disabled={isMaxZoom}
            title="Zoom in"
            aria-label="Zoom in"
            className="ric-controls-zoomin"
          >
            <ZoomInIcon />
          </ControlButton>
          <ControlButton
            onClick={handleZoomOut}
            disabled={isMinZoom}
            title="Zoom out"
            aria-label="Zoom out"
            className="ric-controls-zoomout"
          >
            <ZoomOutIcon />
          </ControlButton>
        </>
      )}
      {showFitView && (
        <ControlButton
          onClick={handleFitView}
          title="Fit view"
          aria-label="Fit view"
          className="ric-controls-fitview"
        >
          <FitViewIcon />
        </ControlButton>
      )}
      {showInteractive && (
        <ControlButton
          onClick={handleInteractiveToggle}
          title={isInteractive ? 'Lock interactivity' : 'Unlock interactivity'}
          aria-label={isInteractive ? 'Lock interactivity' : 'Unlock interactivity'}
          className="ric-controls-interactive"
        >
          {isInteractive ? <UnlockIcon /> : <LockIcon />}
        </ControlButton>
      )}
      {children}
    </div>
  );
}

const btnStyle = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  color: '#333',
  padding: 0,
};

export default memo(Controls);
