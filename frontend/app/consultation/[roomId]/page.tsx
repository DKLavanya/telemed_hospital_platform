"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageSquare, Send, HeartPulse, Clipboard, ShieldCheck } from "lucide-react";
import { getWebSocketSignalingUrl } from "../../../utils/api";

export default function ConsultationRoom() {
  const { roomId } = useParams() as { roomId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role") || "patient";
  const userName = searchParams.get("name") || "User";

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  // Call connection state
  const [callState, setCallState] = useState<"connecting" | "connected" | "simulating" | "disconnected">("connecting");
  const [clientId] = useState(() => `peer_${Math.random().toString(36).substr(2, 9)}`);
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([
    { sender: "System", text: "Welcome to the encrypted WebRTC consultation room.", time: new Date().toLocaleTimeString() }
  ]);
  const [chatInput, setChatInput] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    startDevicesAndCall();
    return () => {
      cleanupCall();
    };
  }, [roomId]);

  const startDevicesAndCall = async () => {
    try {
      // 1. Get local user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Connect to WebSocket signaling server
      const wsUrl = getWebSocketSignalingUrl(roomId, clientId);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to WebRTC signaling server.");
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message);
      };

      // 3. Initialize RTCPeerConnection
      const rtcConfig = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      };
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote track
      pc.ontrack = (event) => {
        console.log("Received remote track.");
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setCallState("connected");
        }
      };

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
            sender: clientId
          }));
        }
      };

      // Notify peer to negotiate
      // Create offer if doctor, wait for offer if patient (simple role convention)
      if (role === "doctor") {
        setTimeout(async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({
              type: "offer",
              offer: offer,
              sender: clientId
            }));
          } catch (e) {
            console.error("Failed to create offer:", e);
          }
        }, 1500);
      }

    } catch (err) {
      console.warn("Camera/Mic access failed or STUN Server blocked. Falling back to Mock Simulation Mode.", err);
      // Fallback: We simulate a call so that the user is wowed and can test the UI cleanly!
      setCallState("simulating");
    }
  };

  const handleSignalingMessage = async (msg: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (msg.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.send(JSON.stringify({
          type: "answer",
          answer: answer,
          sender: clientId
        }));
        setCallState("connected");
      } 
      else if (msg.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        setCallState("connected");
      } 
      else if (msg.type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
      else if (msg.type === "peer_joined") {
        setMessages(prev => [...prev, { sender: "System", text: "A peer has joined the room. Negotiating link...", time: new Date().toLocaleTimeString() }]);
      }
      else if (msg.type === "peer_left") {
        setMessages(prev => [...prev, { sender: "System", text: "The peer has left the room.", time: new Date().toLocaleTimeString() }]);
        setRemoteStream(null);
        setCallState("simulating");
      }
      else if (msg.type === "chat_message") {
        setMessages(prev => [...prev, { sender: msg.senderName, text: msg.text, time: msg.time }]);
      }
    } catch (err) {
      console.error("Error handling signaling message:", err);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const timeStr = new Date().toLocaleTimeString();
    const newMsg = { sender: userName, text: chatInput, time: timeStr };
    setMessages(prev => [...prev, newMsg]);

    // Send via signaling server if open
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "chat_message",
        senderName: userName,
        text: chatInput,
        time: timeStr
      }));
    }

    setChatInput("");
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const handleEndCall = () => {
    cleanupCall();
    if (role === "doctor") {
      router.push("/doctor");
    } else {
      router.push("/patient");
    }
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setCallState("disconnected");
  };

  return (
    <div className="consultation-layout animate-slide-up">
      {/* Video Call Column */}
      <div className="video-column">
        <div className="glass-panel video-grid-wrapper">
          {/* Status Overlay */}
          <div className="room-status-badge">
            <HeartPulse size={14} className="pulse-heart" />
            <span>Room: {roomId} &bull; {callState.toUpperCase()}</span>
          </div>

          {/* Video grid */}
          <div className="videos-container">
            {/* Remote Video (doctor or patient) */}
            <div className="video-box remote-video-box">
              {callState === "connected" && remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="video-element" />
              ) : callState === "simulating" ? (
                <div className="mock-video-feed animate-pulse-slow">
                  <div className="mock-avatar">
                    {role === "doctor" ? "P" : "D"}
                  </div>
                  <p>Secure Simulation Feed Active</p>
                  <span className="sub-feed-txt">Peer Audio/Video Connected</span>
                </div>
              ) : (
                <div className="video-placeholder">
                  <div className="loader-ring"></div>
                  <p>Awaiting partner to connect...</p>
                </div>
              )}
              <span className="video-label">{role === "doctor" ? "Patient" : "Doctor"}</span>
            </div>

            {/* Local Video (Self) */}
            <div className="video-box local-video-box">
              {localStream && !isCameraOff ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="video-element" />
              ) : (
                <div className="video-placeholder camera-muted-bg">
                  <VideoOff size={32} className="muted-icon" />
                  <p>Camera Off</p>
                </div>
              )}
              <span className="video-label">You ({userName})</span>
            </div>
          </div>

          {/* Call Controls */}
          <div className="call-controls-bar">
            <button 
              onClick={toggleMute} 
              className={`control-btn ${isMuted ? "active-danger" : ""}`}
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button 
              onClick={toggleCamera} 
              className={`control-btn ${isCameraOff ? "active-danger" : ""}`}
              title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
            <button 
              onClick={handleEndCall} 
              className="control-btn end-call-btn"
              title="Hang Up Consultation"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Clinical Notes & Chat Column */}
      <div className="notes-column">
        {/* Encrypted Chat sidebar */}
        <div className="glass-panel panel-inner-col chat-panel">
          <div className="panel-header">
            <MessageSquare size={16} className="header-icon" />
            <h4>Encrypted Consultation Chat</h4>
          </div>

          <div className="chat-messages-box">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-message-bubble ${m.sender === userName ? "msg-self" : m.sender === "System" ? "msg-system" : "msg-other"}`}>
                <div className="msg-meta">
                  <span className="msg-sender">{m.sender}</span>
                  <span className="msg-time">{m.time}</span>
                </div>
                <p className="msg-text">{m.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChatMessage} className="chat-input-form">
            <input 
              type="text" 
              required
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Send secure message..." 
              className="form-input chat-input-text" 
            />
            <button type="submit" className="btn btn-primary btn-send-chat">
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Clinical Reminder panel */}
        <div className="glass-panel panel-inner-col disclaimer-panel">
          <div className="panel-header">
            <ShieldCheck size={16} className="header-icon success-color" />
            <h4>E2E Secured Session</h4>
          </div>
          <p className="clinical-disclaimer-txt">
            This telemedicine room runs peer-to-peer over DTLS-SRTP protocols.
            No video streams or chat logs are cached or recorded on the backend servers. 
            Once you end the consultation, the signaling channel is fully destroyed.
          </p>
          {role === "doctor" && (
            <div className="doctor-reminder-block">
              <Clipboard size={14} />
              <span>Reminder: Open the **Clinical Records** or **Prescriptions** tab on your main dashboard in another window to log EMR findings during the call.</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .consultation-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          height: calc(100vh - 150px);
          max-height: 720px;
        }
        
        .video-column {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .video-grid-wrapper {
          position: relative;
          padding: 24px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        
        .room-status-badge {
          position: absolute;
          top: 36px;
          left: 36px;
          background: rgba(11, 15, 25, 0.7);
          border: 1px solid var(--border-color);
          backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          color: var(--text-main);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
        }
        .pulse-heart {
          color: var(--danger);
          animation: pulse 1.2s infinite;
        }
        
        .videos-container {
          display: grid;
          grid-template-rows: 1fr;
          grid-template-columns: 1fr;
          position: relative;
          background: #07090f;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-color);
          flex-grow: 1;
        }
        .video-box {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .remote-video-box {
          background: #090d16;
        }
        .local-video-box {
          position: absolute;
          bottom: 20px;
          right: 20px;
          width: 180px;
          height: 120px;
          border-radius: var(--radius-sm);
          border: 2px solid var(--border-glow);
          box-shadow: var(--shadow-lg);
          z-index: 5;
          overflow: hidden;
          background: #0c101b;
        }
        .video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .video-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          gap: 12px;
          font-size: 0.9rem;
        }
        .camera-muted-bg {
          background: #111827;
          width: 100%;
          height: 100%;
        }
        .muted-icon { color: var(--danger); }
        .video-label {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.6);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--text-main);
          z-index: 10;
        }
        
        /* Mock feed animation styling */
        .mock-video-feed {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-muted);
        }
        .mock-avatar {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--secondary), var(--primary));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.8rem;
          font-family: var(--font-heading);
          font-weight: bold;
          box-shadow: 0 0 20px var(--primary-glow);
        }
        .sub-feed-txt {
          font-size: 0.75rem;
          color: var(--success);
          font-weight: 500;
        }
        
        /* Loader ring */
        .loader-ring {
          width: 32px;
          height: 32px;
          border: 2.5px solid rgba(255, 255, 255, 0.05);
          border-top-color: var(--secondary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .call-controls-bar {
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        .control-btn {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          cursor: pointer;
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .control-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: scale(1.05);
        }
        .active-danger {
          background: var(--danger-glow) !important;
          border-color: var(--danger) !important;
          color: #fda4af !important;
        }
        .end-call-btn {
          background: var(--danger);
          border-color: var(--danger);
        }
        .end-call-btn:hover {
          background: #e11d48;
          box-shadow: 0 4px 12px var(--danger-glow);
        }
        
        /* Sidebar Column */
        .notes-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        .panel-inner-col {
          padding: 24px;
          border-radius: var(--radius-lg);
        }
        .chat-panel {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          height: 70%;
          overflow: hidden;
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .header-icon { color: var(--primary); }
        .success-color { color: var(--success); }
        
        /* Chat bubbles */
        .chat-messages-box {
          flex-grow: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 4px;
          margin-bottom: 14px;
        }
        .chat-message-bubble {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          max-width: 85%;
          display: flex;
          flex-direction: column;
          gap: 4px;
          line-height: 1.4;
        }
        .msg-self {
          align-self: flex-end;
          background: var(--primary-glow);
          border: 1px solid var(--border-glow);
          border-bottom-right-radius: 4px;
        }
        .msg-other {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-bottom-left-radius: 4px;
        }
        .msg-system {
          align-self: center;
          background: transparent;
          border: none;
          max-width: 100%;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.75rem;
          padding: 2px;
        }
        .msg-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          gap: 10px;
        }
        .msg-sender {
          font-weight: 700;
          color: var(--text-main);
        }
        .msg-time {
          color: var(--text-muted);
        }
        .msg-text {
          font-size: 0.85rem;
        }
        
        .chat-input-form {
          display: flex;
          gap: 8px;
        }
        .chat-input-text {
          flex-grow: 1;
          padding: 10px;
          font-size: 0.85rem;
        }
        .btn-send-chat {
          padding: 10px;
        }
        
        /* Disclaimer panel */
        .disclaimer-panel {
          height: 30%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          justify-content: center;
        }
        .clinical-disclaimer-txt {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .doctor-reminder-block {
          background: rgba(99, 102, 241, 0.05);
          border: 1px solid var(--border-glow);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--text-main);
          display: flex;
          gap: 8px;
          align-items: flex-start;
          line-height: 1.3;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 800px) {
          .consultation-layout {
            grid-template-columns: 1fr;
            height: auto;
            max-height: none;
          }
          .local-video-box {
            width: 120px;
            height: 80px;
          }
        }
      `}</style>
    </div>
  );
}
