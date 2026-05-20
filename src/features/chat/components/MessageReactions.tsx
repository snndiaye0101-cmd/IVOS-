import { Check, AlertTriangle, Sparkles } from 'lucide-react';

interface MessageReactionsProps {
  reactions: { type: 'check' | 'warning' | 'bravo'; count: number }[];
  onReact: (type: 'check' | 'warning' | 'bravo') => void;
}

export default function MessageReactions({ reactions, onReact }: MessageReactionsProps) {
  return (
    <div className="ml-2 flex gap-1">
      <button onClick={() => onReact('check')} className="transition hover:scale-110">
        <Check size={16} className="text-green-500" />
      </button>
      <button onClick={() => onReact('warning')} className="transition hover:scale-110">
        <AlertTriangle size={16} className="text-yellow-500" />
      </button>
      <button onClick={() => onReact('bravo')} className="transition hover:scale-110">
        <Sparkles size={16} className="text-blue-500" />
      </button>
      {reactions.map((r) => (
        <span key={r.type} className="ml-1 align-middle text-xs font-bold">
          {r.type === 'check' && <Check size={12} className="inline text-green-500" />}
          {r.type === 'warning' && <AlertTriangle size={12} className="inline text-yellow-500" />}
          {r.type === 'bravo' && <Sparkles size={12} className="inline text-blue-500" />}
          {r.count}
        </span>
      ))}
    </div>
  );
}
