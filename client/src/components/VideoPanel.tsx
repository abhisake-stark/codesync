import React, { useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  role: string;
}

export const VideoPanel: React.FC<VideoPanelProps> = ({
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  onToggleAudio,
  onToggleVideo,
  role
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (role === 'spectator') return null;

  return (
    <Draggable bounds="parent" defaultPosition={{ x: 20, y: 80 }}>
      <div className="absolute z-50 flex flex-col gap-2 bg-gray-900 border border-gray-700 p-2 rounded-xl shadow-2xl w-64 cursor-move">
        
        {/* Remote Video (Big) */}
        <div className="relative w-full h-40 bg-black rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-500 text-sm font-semibold flex flex-col items-center gap-2">
              <span className="animate-pulse">Waiting for peer...</span>
            </div>
          )}
        </div>

        {/* Local Video (Small Picture in Picture style) */}
        <div className="absolute top-4 right-4 w-20 h-28 bg-black rounded border-2 border-gray-700 overflow-hidden shadow-lg z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" style={{ transform: 'scaleX(-1)' }} />
          {(isMuted || isVideoOff) && (
            <div className="absolute bottom-1 right-1 flex gap-1 bg-black/60 rounded px-1">
              {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
              {isVideoOff && <VideoOff className="w-3 h-3 text-red-500" />}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3 pt-1">
          <button 
            onClick={onToggleAudio}
            className={`p-2 rounded-full transition-colors \${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={onToggleVideo}
            className={`p-2 rounded-full transition-colors \${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        </div>

      </div>
    </Draggable>
  );
};
