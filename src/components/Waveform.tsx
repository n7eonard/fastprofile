import { useEffect, useRef } from "react";

interface WaveformProps {
  audioStream: MediaStream | null;
  isActive: boolean;
}

const Waveform = ({ audioStream, isActive }: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!audioStream || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);
    
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    source.connect(analyser);
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) return;

      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

      canvasCtx.fillStyle = "transparent";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 20;
      const bars = 64;
      
      for (let i = 0; i < bars; i++) {
        const dataIndex = Math.floor((i * dataArrayRef.current.length) / bars);
        const value = dataArrayRef.current[dataIndex] / 255.0;
        const barHeight = value * radius * 0.6;
        
        const angle = (i * 2 * Math.PI) / bars - Math.PI / 2;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);
        
        const gradient = canvasCtx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, "hsl(var(--primary))");
        gradient.addColorStop(1, "hsl(var(--primary) / 0.3)");
        
        canvasCtx.strokeStyle = gradient;
        canvasCtx.lineWidth = 3;
        canvasCtx.lineCap = "round";
        canvasCtx.beginPath();
        canvasCtx.moveTo(x1, y1);
        canvasCtx.lineTo(x2, y2);
        canvasCtx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [audioStream, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="w-64 h-64 md:w-80 md:h-80"
    />
  );
};

export default Waveform;
