import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';

interface SignaturePadProps {
  onSignatureEnd: (signature: string) => void;
}

const SIGNATURE_BACKGROUND_COLOR = '#ffffff';
const SIGNATURE_PEN_COLOR = '#00236f';
const SIGNATURE_PLACEHOLDER_COLOR = '#757682';


export const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getContext = useCallback(() => {
    return canvasRef.current?.getContext('2d') ?? null;
  }, []);

  const drawPlaceholder = useCallback(() => {
    const context = getContext();
    const canvas = canvasRef.current;
    if (context && canvas) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.width / ratio;
      const height = canvas.height / ratio;

      context.save();
      context.font = '20px Inter, sans-serif';
      context.fillStyle = SIGNATURE_PLACEHOLDER_COLOR;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('Sign Here', width / 2, height / 2);
      context.restore();
    }
  }, [getContext]);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = getContext();
    if (canvas && context) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        
        // Fill background color, effectively clearing the canvas
        context.fillStyle = SIGNATURE_BACKGROUND_COLOR;
        context.fillRect(0, 0, canvas.width / ratio, canvas.height / ratio);
        
        drawPlaceholder();
    }
  }, [getContext, drawPlaceholder]);


  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      
      const context = getContext();
      if (context) {
        context.scale(ratio, ratio);
        context.lineCap = 'round';
        context.strokeStyle = SIGNATURE_PEN_COLOR;
        context.lineWidth = 2.5;
        
        if (isEmpty) {
          resetCanvas();
        }
      }
    }
  }, [getContext, isEmpty, resetCanvas]);

  const getCoords = (event: React.MouseEvent | React.TouchEvent): [number, number] | undefined => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in event.nativeEvent ? event.nativeEvent.touches[0].clientX : event.nativeEvent.clientX;
    const clientY = 'touches' in event.nativeEvent ? event.nativeEvent.touches[0].clientY : event.nativeEvent.clientY;
    return [clientX - rect.left, clientY - rect.top];
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    const context = getContext();
    const coords = getCoords(event);
    if (context && coords) {
      if (isEmpty) {
        // Clear placeholder by drawing background over it
        const canvas = canvasRef.current;
        if (canvas) {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            context.fillStyle = SIGNATURE_BACKGROUND_COLOR;
            context.fillRect(0, 0, canvas.width / ratio, canvas.height / ratio);
        }
        setIsEmpty(false);
      }
      context.beginPath();
      context.moveTo(coords[0], coords[1]);
      setIsDrawing(true);
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    if (!isDrawing) return;
    const context = getContext();
    const coords = getCoords(event);
    if (context && coords) {
      context.lineTo(coords[0], coords[1]);
      context.stroke();
    }
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) {
      onSignatureEnd(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    resetCanvas();
    setIsEmpty(true);
    onSignatureEnd('');
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={finishDrawing}
        className="w-full touch-none rounded-lg border-2 border-slate-300 bg-white aspect-[3/1] focus:border-theme-yellow focus:ring-2 focus:ring-theme-yellow/50 focus:outline-none dark:border-slate-600"
      />
      <div className="mt-2 text-right">
        <PrimaryButton label="Clear Signature" size="small" variant="danger" onClick={clearSignature} />
      </div>
    </div>
  );
};