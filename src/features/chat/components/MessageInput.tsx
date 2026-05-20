// ============= MESSAGE INPUT COMPONENT =============
// Input avec support des fichiers, emojis, et mentions

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageInputProps {
  onSend: (message: {
    content: string;
    type?: 'text' | 'image' | 'file' | 'location';
    fileUrl?: string;
    fileName?: string;
  }) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function MessageInput({
  onSend,
  isLoading = false,
  disabled = false,
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 44), 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Close emoji picker on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    if (showEmoji) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  // Handle message send
  const handleSend = async () => {
    if (!input.trim() && !file) return;

    const messageData: any = {
      content: input,
      type: 'text',
    };

    if (file && filePreview) {
      messageData.type = file.type.startsWith('image/') ? 'image' : 'file';
      messageData.fileUrl = filePreview;
      messageData.fileName = file.name;
    }

    await onSend(messageData);

    // Reset
    setInput('');
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    textareaRef.current?.focus();
  };

  // Handle textarea keydown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Insert emoji
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setInput((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const newVal = input.slice(0, start) + emoji + input.slice(end);
    setInput(newVal);
    setShowEmoji(false);
    setTimeout(() => {
      el.focus();
      const newPos = start + emoji.length;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const emojis = ['😀', '😂', '😍', '😎', '👍', '🙏', '🎉', '🚗', '🔥', '💡', '❤️', '⭐'];

  return (
    <div className="border-t border-slate-700 bg-slate-800/50 p-4 backdrop-blur-xl">
      {/* File Preview */}
      {filePreview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center gap-2"
        >
          <img
            src={filePreview}
            alt="aperçu"
            className="h-16 w-16 rounded-lg border border-indigo-500 object-cover shadow-lg"
          />
          <button
            onClick={() => {
              setFile(null);
              setFilePreview(null);
            }}
            className="rounded-lg bg-red-600/50 p-1 text-red-200 transition-all hover:bg-red-600"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* File Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="flex-shrink-0 rounded-lg bg-slate-700/50 p-2.5 text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:opacity-50"
          title="Joindre un fichier"
        >
          <Paperclip size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isLoading}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          placeholder="Écrire un message... (Shift+Entrée pour nouvelle ligne)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          style={{ minHeight: '44px', maxHeight: '200px' }}
        />

        {/* Emoji Button */}
        <div className="relative">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            disabled={disabled || isLoading}
            className="flex-shrink-0 rounded-lg bg-slate-700/50 p-2.5 text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:opacity-50"
            title="Ajouter un emoji"
          >
            <Smile size={20} />
          </button>

          {/* Emoji Picker */}
          {showEmoji && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-14 right-0 z-50 w-72 rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-2xl"
            >
              <div className="grid grid-cols-6 gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="text-2xl transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && !file) || isLoading || disabled}
          className="flex-shrink-0 rounded-lg bg-indigo-600 p-2.5 text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Envoyer"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
