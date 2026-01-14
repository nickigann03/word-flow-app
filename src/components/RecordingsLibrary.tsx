'use client';
import { useState, useEffect } from 'react';
import { Download, Copy, Trash2, Clock, FileAudio, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import firestoreService, { Recording } from '@/services/firestoreService';
import audioRecorderService from '@/services/audioRecorderService';
import { useToast } from './Toast';

interface RecordingsLibraryProps {
    userId: string;
    onClose: () => void;
}

export default function RecordingsLibrary({ userId, onClose }: RecordingsLibraryProps) {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const toast = useToast();

    useEffect(() => {
        if (!userId) return;

        const unsubscribe = firestoreService.subscribeRecordings(userId, (data) => {
            setRecordings(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown date';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCopyTranscript = async (recording: Recording) => {
        try {
            await navigator.clipboard.writeText(recording.transcript);
            setCopiedId(recording.id!);
            toast.success('Copied!', 'Transcript copied to clipboard');
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            toast.error('Copy Failed', 'Could not copy to clipboard');
        }
    };

    const handleDownloadAudio = (recording: Recording) => {
        if (recording.audioUrl) {
            window.open(recording.audioUrl, '_blank');
            toast.success('Downloading', 'Audio file download started');
        } else {
            toast.error('No Audio', 'Audio file not available for this recording');
        }
    };

    const handleDeleteRecording = async (recordingId: string) => {
        if (!confirm('Delete this recording? This cannot be undone.')) return;

        try {
            await firestoreService.deleteRecording(recordingId);
            toast.success('Deleted', 'Recording removed');
        } catch (error) {
            toast.error('Delete Failed', (error as Error).message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileAudio className="w-6 h-6 text-orange-500" />
                            Recordings Library
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Access all your sermon recordings and transcripts
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                    ) : recordings.length === 0 ? (
                        <div className="text-center py-12">
                            <FileAudio className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-400">No recordings yet</p>
                            <p className="text-sm text-zinc-500 mt-1">
                                Your sermon recordings will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recordings.map((recording) => (
                                <div
                                    key={recording.id}
                                    className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors"
                                >
                                    {/* Recording Header */}
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === recording.id ? null : recording.id!)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                                                <FileAudio className="w-5 h-5 text-orange-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-white">
                                                    {recording.noteTitle || 'Untitled Recording'}
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDuration(recording.duration)}
                                                    </span>
                                                    <span>{formatDate(recording.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {expandedId === recording.id ? (
                                                <ChevronUp className="w-5 h-5 text-zinc-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-zinc-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {expandedId === recording.id && (
                                        <div className="border-t border-zinc-700/50 p-4 space-y-4">
                                            {/* Transcript Preview */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                                        Raw Transcript (copy for AI chatbots)
                                                    </label>
                                                    <button
                                                        onClick={() => handleCopyTranscript(recording)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                                    >
                                                        {copiedId === recording.id ? (
                                                            <>
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3.5 h-3.5" />
                                                                Copy Transcript
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-3 max-h-40 overflow-y-auto">
                                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                                                        {recording.transcript || 'No transcript available'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 pt-2">
                                                {recording.audioUrl && (
                                                    <button
                                                        onClick={() => handleDownloadAudio(recording)}
                                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download Audio
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteRecording(recording.id!)}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors ml-auto"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                    <p className="text-xs text-zinc-500 text-center">
                        💡 Tip: Copy transcripts to use with ChatGPT, Claude, or other AI tools for sermon analysis
                    </p>
                </div>
            </div>
        </div>
    );
}
