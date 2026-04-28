import React, { useState } from "react";
import { Mic, MicOff, Video, VideoOff, ScreenShare, X } from "lucide-react";

interface VideoMeetingProps {
  onClose: () => void;
}

const VideoMeeting: React.FC<VideoMeetingProps> = ({ onClose }) => {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [screen, setScreen] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative flex flex-col items-center">
        <button className="absolute top-3 right-3 text-slate-400 hover:text-red-600" onClick={onClose}><X size={28} /></button>
        <div className="w-full h-72 bg-slate-200 rounded-xl flex items-center justify-center mb-6 shadow-inner">
          {/* Ici tu peux intégrer Jitsi ou un mock vidéo */}
          <span className="text-slate-400 text-lg">[Vidéo conférence en cours]</span>
        </div>
        <div className="flex gap-6 justify-center">
          <button onClick={() => setMic(m => !m)} className={`p-3 rounded-full shadow ${mic ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{mic ? <Mic size={24}/> : <MicOff size={24}/>}</button>
          <button onClick={() => setCam(c => !c)} className={`p-3 rounded-full shadow ${cam ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{cam ? <Video size={24}/> : <VideoOff size={24}/>}</button>
          <button onClick={() => setScreen(s => !s)} className={`p-3 rounded-full shadow ${screen ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}><ScreenShare size={24}/></button>
        </div>
      </div>
    </div>
  );
};

export default VideoMeeting;
