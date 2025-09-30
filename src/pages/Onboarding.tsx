import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setHasMicPermission(true);
      
      // Set up audio analysis for voice detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Start voice detection loop
      detectVoiceActivity();
      
      // Auto-start recording after UI renders
      setTimeout(() => {
        startRecordingWithStream(stream).catch(err => {
          console.error("Auto-start recording failed:", err);
        });
      }, 300);
    } catch (error) {
      toast.error("Could not access microphone");
      console.error("Error accessing microphone:", error);
    }
  };

  const detectVoiceActivity = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const checkAudio = () => {
      if (!analyserRef.current || !isRecording) {
        animationFrameRef.current = requestAnimationFrame(checkAudio);
        return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      
      // Threshold for voice detection (adjust as needed)
      const threshold = 20;
      setIsSpeaking(average > threshold);
      
      animationFrameRef.current = requestAnimationFrame(checkAudio);
    };
    
    checkAudio();
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

  const handlePreviousQuestion = async () => {
    if (currentQuestion === 0) return;
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await saveRecording(audioBlob, currentQuestion + 1);
        audioChunksRef.current = [];
        
        setCurrentQuestion(currentQuestion - 1);
        
        // Restart recording for previous question
        if (audioStream) {
          setTimeout(() => {
            startRecordingWithStream(audioStream).catch(err => {
              console.error("Failed to restart recording:", err);
            });
          }, 300);
        }
      };
    }
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

  const handleScreenTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRecording) return;
    
    const screenWidth = window.innerWidth;
    const tapX = e.clientX;
    
    // Left half of screen - go back
    if (tapX < screenWidth / 2) {
      handlePreviousQuestion();
    } 
    // Right half of screen - go forward
    else {
      handleNextQuestion();
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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
      className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative cursor-pointer"
      onClick={handleScreenTap}
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
          <div className="text-muted-foreground text-sm md:text-base mb-8 flex items-center gap-4">
            <span className="opacity-60">← Previous</span>
            <span>Tap left or right to navigate</span>
            <span className="opacity-60">Next →</span>
          </div>
        )}
      </div>

      {/* Animated Microphone Icon */}
      <div className="absolute bottom-12 flex flex-col items-center gap-4">
        <div className="relative">
          {/* Outer animated ring - only visible when speaking */}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 -m-8 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute inset-0 -m-6 rounded-full border-2 border-primary/40 animate-pulse" />
              <div className="absolute inset-0 -m-4 rounded-full border-2 border-primary/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
            </>
          )}
          
          {/* Microphone circle */}
          <div className={`relative w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center transition-all duration-300 ${
            isSpeaking ? 'scale-105 bg-primary/30' : 'scale-100'
          }`}>
            <div className="w-24 h-24 rounded-full bg-primary/40 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <Mic className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
