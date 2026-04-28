// ============= MESSAGE BUBBLE COMPONENT =============
// Affiche les messages de chat individuels avec édition/suppression

import React, { useState } from "react";
import { Trash2, Edit2, Smile } from "lucide-react";
import { motion } from "framer-motion";

interface MessageBubbleProps {
  id: string;
  content: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  type?: "text" | "image" | "file" | "location";
  fileUrl?: string;
  fileName?: string;
  isOwn: boolean;
  isDeleted?: boolean;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

export default function MessageBubble({
  id,
  content,
  userName,
  userAvatar,
  timestamp,
  type = "text",
  fileUrl,
  fileName,
  isOwn,
  isDeleted,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleEditSave = async () => {
    if (onEdit && editedContent.trim()) {
      await onEdit(id, editedContent);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      className={`flex gap-3 mb-4 group ${isOwn ? "flex-row-reverse" : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {userAvatar && (
        <img
          src={userAvatar}
          alt={userName}
          className="w-9 h-9 rounded-full flex-shrink-0 shadow-lg object-cover"
        />
      )}
      {!userAvatar && (
        <div
          className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-lg ${
            isOwn
              ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white"
              : "bg-slate-700 text-slate-200"
          }`}
          title={userName}
        >
          {userName[0]?.toUpperCase()}
        </div>
      )}

      {/* Message Content */}
      <div
        className={`flex flex-col justify-center ${isOwn ? "items-end" : "items-start"}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-white text-sm">{userName}</span>
          <span className="text-xs text-slate-400">{timestamp}</span>
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl max-w-md px-4 py-2 ${
            isOwn
              ? "bg-indigo-600 text-white rounded-br-none"
              : "bg-slate-700 text-slate-100 rounded-bl-none"
          } ${isDeleted ? "italic opacity-50" : ""}`}
        >
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="bg-slate-800 text-white rounded px-2 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              autoFocus
            />
          ) : (
            <>
              {type === "text" && (
                <p className="break-words whitespace-pre-wrap text-sm">
                  {isDeleted ? "Message supprimé" : content}
                </p>
              )}
              {type === "image" && fileUrl && (
                <img
                  src={fileUrl}
                  alt="image"
                  className="max-w-xs rounded-lg mt-2 shadow-lg"
                />
              )}
              {type === "file" && fileName && (
                <a
                  href={fileUrl}
                  download
                  className="flex items-center gap-2 text-indigo-300 hover:underline text-sm"
                >
                  📎 {fileName}
                </a>
              )}
              {type === "location" && (
                <div className="flex items-center gap-2 text-sm">
                  📍 {content}
                </div>
              )}
            </>
          )}
        </div>

        {/* Edit Controls */}
        {isEditing && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleEditSave}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-all"
            >
              Enregistrer
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedContent(content);
              }}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs rounded transition-all"
            >
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && !isDeleted && (
        <div className={`flex gap-1 ${isOwn ? "flex-row-reverse" : ""}`}>
          {isOwn && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-blue-400 transition-all"
              title="Éditer"
            >
              <Edit2 size={16} />
            </button>
          )}

          {isOwn && onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-all"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
