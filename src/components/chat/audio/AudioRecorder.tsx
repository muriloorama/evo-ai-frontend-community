import React, { useEffect, useRef } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Play, Pause, Square, Trash2, Mic } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAudioRecorder, AudioRecordingData } from '@/hooks/chat/useAudioRecorder';

interface AudioRecorderProps {
  onRecordingComplete: (data: AudioRecordingData) => void;
  onRecordingCancel?: () => void;
  disabled?: boolean;
  className?: string;
  autoStart?: boolean;
  preferWhatsAppCloudFormat?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingCancel,
  disabled = false,
  className = '',
  autoStart = false,
  preferWhatsAppCloudFormat = false,
}) => {
  const { t } = useLanguage('chat');
  const {
    isRecording,
    isPaused,
    duration,
    hasRecording,
    recordingData,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    isSupported,
  } = useAudioRecorder({ preferWhatsAppCloudFormat });

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-iniciar gravação se especificado
  useEffect(() => {
    if (autoStart && !isRecording && !hasRecording && !disabled) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isRecording, hasRecording, disabled]);

  // Controlar reprodução do áudio
  const togglePlayback = () => {
    if (!audioRef.current || !recordingData) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Finalizar gravação
  const handleComplete = () => {
    if (recordingData) {
      onRecordingComplete(recordingData);
      deleteRecording();
    }
  };

  // Cancelar gravação
  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    deleteRecording();
    onRecordingCancel?.();
  };

  if (!isSupported) {
    return (
      <div className={`p-4 text-center text-muted-foreground ${className}`}>
        <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('audioRecorder.notSupported')}</p>
      </div>
    );
  }

  return (
    <div className={`bg-background border rounded-lg p-2 md:p-3 ${className}`}>
      {/* Tudo em uma linha compacta — botões maiores no mobile */}
      <div className="flex items-center justify-between gap-2 md:gap-3">
        {/* Controles à esquerda */}
        <div className="flex items-center gap-2">
          {!isRecording && !hasRecording && (
            <Button
              size="sm"
              onClick={startRecording}
              disabled={disabled}
              className="bg-green-500 hover:bg-green-600 text-white h-10 md:h-9 px-3"
            >
              <Mic className="h-5 w-5 md:h-4 md:w-4 mr-1" />
              <span>{t('audioRecorder.record')}</span>
            </Button>
          )}

          {isRecording && (
            <>
              <Button
                size="icon"
                variant="outline"
                onClick={isPaused ? resumeRecording : pauseRecording}
                disabled={disabled}
                className="h-11 w-11 md:h-9 md:w-9"
              >
                {isPaused ? <Play className="h-5 w-5 md:h-4 md:w-4" /> : <Pause className="h-5 w-5 md:h-4 md:w-4" />}
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={stopRecording}
                disabled={disabled}
                className="h-11 w-11 md:h-9 md:w-9"
              >
                <Square className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </>
          )}

          {hasRecording && (
            <>
              <Button
                size="icon"
                variant="outline"
                onClick={togglePlayback}
                disabled={disabled}
                className="h-11 w-11 md:h-9 md:w-9"
              >
                {isPlaying ? <Pause className="h-5 w-5 md:h-4 md:w-4" /> : <Play className="h-5 w-5 md:h-4 md:w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCancel}
                disabled={disabled}
                className="h-11 w-11 md:h-9 md:w-9"
              >
                <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Timer no centro */}
        <div className="flex items-center gap-2">
          {isRecording && !isPaused && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          {isRecording && isPaused && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
          <span className="text-lg font-mono font-medium">{formatDuration(duration)}</span>
          {isPaused && (
            <span className="hidden md:inline text-sm text-muted-foreground">
              {t('audioRecorder.paused')}
            </span>
          )}
        </div>

        {/* Botão enviar à direita */}
        {hasRecording ? (
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={disabled}
            className="bg-green-500 hover:bg-green-600 text-white h-10 md:h-9 px-3"
          >
            {t('audioRecorder.send')}
          </Button>
        ) : (
          <div className="w-11 md:w-16" /> // Placeholder para manter alinhamento
        )}
      </div>

      {/* Audio element para reprodução */}
      {recordingData && (
        <audio
          ref={audioRef}
          src={recordingData.url}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          className="hidden"
        />
      )}
    </div>
  );
};

export default AudioRecorder;
