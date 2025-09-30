import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Waveform from "@/components/Waveform";

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
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setHasMicPermission(true);
      
      // Auto-start recording after UI renders
      setTimeout(() => {
        startRecordingWithStream(stream).catch(err => {
          console.error("Auto-start recording failed:", err);
          // Silently fail - UI is already rendered
        });
      }, 300);
    } catch (error) {
      toast.error("Could not access microphone");
      console.error("Error accessing microphone:", error);
    }
  };

  const startRecordingWithStream = async (stream: MediaStream) => {
    audioChunksRef.current = [];
    
    // Try to create MediaRecorder without any options first
    let mediaRecorder: MediaRecorder;
    
    try {
      mediaRecorder = new MediaRecorder(stream);
      console.log("MediaRecorder created with default settings");
    } catch (e) {
      console.log("Default MediaRecorder failed, trying with specific MIME types");
      // Try with specific MIME types
      const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg'];
      let created = false;
      
      for (const mimeType of mimeTypes) {
        try {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            mediaRecorder = new MediaRecorder(stream, { mimeType });
            console.log(`MediaRecorder created with ${mimeType}`);
            created = true;
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      if (!created) {
        throw new Error('No supported audio format found');
      }
    }
    
    mediaRecorderRef.current = mediaRecorder!;

    mediaRecorder!.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder!.start();
    setIsRecording(true);
    console.log("Recording started successfully");
  };

  const startRecording = async () => {
    if (!audioStream) return;
    await startRecordingWithStream(audioStream);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleNextQuestion = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await saveRecording(audioBlob, currentQuestion + 1);
        audioChunksRef.current = [];
        
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
          // Restart recording for next question
          if (audioStream) {
            setTimeout(() => {
              startRecordingWithStream(audioStream).catch(err => {
                console.error("Failed to restart recording:", err);
              });
            }, 300);
          }
        } else {
          completeOnboarding();
        }
      };
    }
  };

  const saveRecording = async (audioBlob: Blob, questionId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        toast.error("Please log in to save recordings");
        return;
      }

      const fileName = `${user.id}/${questionId}_${Date.now()}.webm`;
      
      console.log('Uploading audio file:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioBlob);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      console.log('Saving recording to database:', { user_id: user.id, question_id: questionId, audio_url: publicUrl });
      
      const { error: dbError } = await (supabase as any)
        .from('recordings')
        .insert({
          user_id: user.id,
          question_id: questionId,
          audio_url: publicUrl
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }
      
      console.log('Recording saved successfully');
      toast.success("Recording saved");
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error("Failed to save recording");
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
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream]);

  if (!hasMicPermission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center max-w-md animate-scale-in">
          <div className="mb-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mic className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Microphone Access Required
            </h2>
            <p className="text-muted-foreground mb-8">
              We need access to your microphone to record your voice responses
            </p>
          </div>
          <Button
            onClick={requestMicPermission}
            size="lg"
            className="rounded-full shadow-glow"
          >
            <Mic className="w-5 h-5 mr-2" />
            Enable Microphone
          </Button>
        </div>
      </div>
    );
  }

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
          <>
            <p className="text-muted-foreground text-sm md:text-base mb-8">
              Tap anywhere to continue to the next question
            </p>
            <div className="mb-8">
              <Waveform audioStream={audioStream} isActive={isRecording && !isPaused} />
            </div>
          </>
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
