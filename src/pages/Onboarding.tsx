import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play } from "lucide-react";
import { toast } from "sonner";

const questions = [
  { id: 1, text: "What's your name?", subtitle: "Let's start with the basics" },
  { id: 2, text: "Why are you here today at AI Summit Barcelona?", subtitle: "Tell us your motivation" },
  { id: 3, text: "Tell us about the topics that interest you most right now?", subtitle: "Share your passions" },
  { id: 4, text: "What would be a successful conference according to your goals?", subtitle: "Define your success" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      toast.error("Could not access microphone");
      console.error("Error accessing microphone:", error);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsComplete(true);
    
    setTimeout(() => {
      navigate("/");
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-fade-in">
        <div className="text-center max-w-md animate-scale-in">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-primary bg-clip-text text-transparent">
            Amazing!
          </h1>
          <p className="text-lg text-muted-foreground">
            We're assembling your profile and it will be ready really soon
          </p>
          <div className="mt-8 flex gap-2 justify-center">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative"
      onClick={isRecording ? handleNextQuestion : undefined}
    >
      {/* Progress indicator */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-2 px-4">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 rounded-full transition-all duration-500 ${
              idx === currentQuestion
                ? "w-12 bg-primary"
                : idx < currentQuestion
                ? "w-8 bg-primary/60"
                : "w-8 bg-border"
            }`}
          />
        ))}
      </div>

      {/* Question display */}
      <div className="max-w-2xl w-full text-center animate-scale-in" key={currentQuestion}>
        <p className="text-accent text-sm md:text-base font-medium mb-4 uppercase tracking-wider">
          {questions[currentQuestion].subtitle}
        </p>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-12 leading-tight">
          {questions[currentQuestion].text}
        </h2>
        
        {isRecording && (
          <p className="text-muted-foreground text-sm md:text-base mb-8">
            Tap anywhere to continue to the next question
          </p>
        )}
      </div>

      {/* Recording controls */}
      <div className="absolute bottom-12 flex flex-col items-center gap-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            size="lg"
            className="rounded-full w-20 h-20 shadow-glow gradient-primary hover:scale-105 transition-transform"
          >
            <Mic className="w-8 h-8" />
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Recording indicator */}
            <div className={`w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center ${!isPaused ? 'animate-pulse-glow' : ''}`}>
              <div className="w-16 h-16 rounded-full bg-primary/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Mic className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
            </div>
            
            {/* Pause/Resume button */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                togglePause();
              }}
              variant="secondary"
              size="sm"
              className="rounded-full"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
