import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, X, Send, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onAudioRecorded, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimer();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
      onCancel();
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      startTimer();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      stopTimer();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      stopTimer();
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
    onAudioRecorded(audioBlob, duration);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
      <Button
        variant="ghost"
        size="icon"
        onClick={onCancel}
        type="button"
      >
        <X className="h-5 w-5 text-destructive" />
      </Button>

      {isRecording && (
        <>
          <div className="flex items-center gap-2 flex-1">
            <Mic className="h-5 w-5 text-red-500 animate-pulse" />
            <div className="flex-1 h-8 bg-background rounded flex items-center px-3">
              <div className="h-1 bg-red-500 rounded" style={{ width: `${(duration % 60) * 1.67}%` }} />
            </div>
            <span className="text-sm font-mono">{formatDuration(duration)}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handlePauseResume}
            type="button"
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={handleStop}
            className="bg-primary"
            type="button"
          >
            <Send className="h-5 w-5" />
          </Button>
        </>
      )}

      {!isRecording && audioUrl && (
        <>
          <audio src={audioUrl} controls className="flex-1 h-10" />
          <span className="text-sm font-mono">{formatDuration(duration)}</span>
          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
            type="button"
          >
            <Send className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
}
