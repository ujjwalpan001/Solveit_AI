import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Download, Maximize } from 'lucide-react';

function VideoPlayer({ question, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleProgressClick = (e) => {
    const video = videoRef.current;
    const progressBar = progressRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = question.videoPath;
    link.download = `ai-tutor-${question._id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen().catch(console.error);
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {question.question}
            </h3>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span className="capitalize">{question.subject}</span>
              <span>•</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Download Video"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="w-full h-auto max-h-96"
            src={question.videoPath}
            onLoadStart={() => setIsPlaying(false)}
            onError={(e) => {
              console.error('Video load error:', e);
              alert('Error loading video. Please try again later.');
            }}
          >
            Your browser does not support the video tag.
          </video>

          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            {/* Progress Bar */}
            <div
              ref={progressRef}
              className="w-full h-2 bg-gray-600 rounded-full cursor-pointer mb-3"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-primary-400 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-primary-400 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer slider"
                  />
                </div>

                <div className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-primary-400 transition-colors"
                  title="Fullscreen"
                >
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Question Details */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <span className="font-medium">Created:</span>{' '}
              {new Date(question.createdAt).toLocaleDateString()}
            </p>
            {question.completedAt && (
              <p>
                <span className="font-medium">Video generated:</span>{' '}
                {new Date(question.completedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
