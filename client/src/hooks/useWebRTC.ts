import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';

export const useWebRTC = (
  socket: Socket | null,
  userId: string | undefined,
  role: string | undefined,
  targetUserId: string | undefined
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState('');
  const peerRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    if (role === 'spectator' || !socket || !userId || !targetUserId) {
      return;
    }

    let streamObj: MediaStream | null = null;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamObj = stream;
        setLocalStream(stream);

        // Initiate if candidate
        const isInitiator = role === 'candidate';

        const peer = new Peer({
          initiator: isInitiator,
          trickle: true,
          stream,
        });

        peer.on('signal', (signal) => {
          socket.emit('webrtc-signal', {
            targetUserId,
            signal
          });
        });

        peer.on('stream', (rStream) => {
          setRemoteStream(rStream);
        });

        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setError('Peer connection error');
        });

        peerRef.current = peer;
      })
      .catch((err) => {
        console.error('Failed to get local stream', err);
        setError('Camera/Mic permission denied');
      });

    const handleSignal = (payload: { senderId: string, targetUserId: string, signal: any }) => {
      if (payload.targetUserId === userId && peerRef.current) {
        try {
          peerRef.current.signal(payload.signal);
        } catch (e) {
          console.error("Signal error", e);
        }
      }
    };

    socket.on('webrtc-signal', handleSignal);

    return () => {
      socket.off('webrtc-signal', handleSignal);
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (streamObj) {
        streamObj.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket, targetUserId, userId, role]);

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // if it was muted, enable it. if it was not muted, disable it.
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff; 
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return { localStream, remoteStream, toggleAudio, toggleVideo, isMuted, isVideoOff, error };
};
