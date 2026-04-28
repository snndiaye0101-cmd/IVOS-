import { Check, AlertTriangle, Sparkles } from 'lucide-react';

interface MessageReactionsProps {
  reactions: { type: 'check' | 'warning' | 'bravo'; count: number }[];
  onReact: (type: 'check' | 'warning' | 'bravo') => void;
}

export default function MessageReactions({ reactions, onReact }: MessageReactionsProps) {
  return (
    <div className="flex gap-1 ml-2">
      <button onClick={() => onReact('check')} className="hover:scale-110 transition"><Check size={16} className="text-green-500" /></button>
      <button onClick={() => onReact('warning')} className="hover:scale-110 transition"><AlertTriangle size={16} className="text-yellow-500" /></button>
      <button onClick={() => onReact('bravo')} className="hover:scale-110 transition"><Sparkles size={16} className="text-blue-500" /></button>
      {reactions.map(r => (
        <span key={r.type} className="ml-1 text-xs font-bold align-middle">
          {r.type === 'check' && <Check size={12} className="inline text-green-500" />} 
          {r.type === 'warning' && <AlertTriangle size={12} className="inline text-yellow-500" />} 
          {r.type === 'bravo' && <Sparkles size={12} className="inline text-blue-500" />} 
          {r.count}
        </span>
      ))}
    </div>
  );
}
