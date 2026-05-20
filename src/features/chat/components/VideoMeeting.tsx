import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, ScreenShare, X } from 'lucide-react';

interface VideoMeetingProps {
  onClose: () => void;
}

const VideoMeeting: React.FC<VideoMeetingProps> = ({ onClose }) => {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [screen, setScreen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative flex w-full max-w-2xl flex-col items-center rounded-2xl bg-white/80 p-6 shadow-2xl backdrop-blur-xl">
        <button
          className="absolute right-3 top-3 text-slate-400 hover:text-red-600"
          onClick={onClose}
        >
          <X size={28} />
        </button>
        <div className="mb-6 flex h-72 w-full items-center justify-center rounded-xl bg-slate-200 shadow-inner">
          {/* Ici tu peux intégrer Jitsi ou un mock vidéo */}
          <span className="text-lg text-slate-400">[Vidéo conférence en cours]</span>
        </div>
        <div className="flex justify-center gap-6">
          <button
            onClick={() => setMic((m) => !m)}
            className={`rounded-full p-3 shadow ${mic ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {mic ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <button
            onClick={() => setCam((c) => !c)}
            className={`rounded-full p-3 shadow ${cam ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {cam ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
          <button
            onClick={() => setScreen((s) => !s)}
            className={`rounded-full p-3 shadow ${screen ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
          >
            <ScreenShare size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoMeeting;
