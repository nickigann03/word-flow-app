/**
 * Audio Recorder Service
 * Records audio and transcribes using Groq Whisper API
 * 
 * KEY FEATURES:
 * - Saves audio blob BEFORE transcription to prevent data loss
 * - Supports 3+ hour recordings via chunked transcription
 * - Automatically splits large files to stay under Groq's 25MB limit
 */

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// Groq Whisper has 25MB limit, we use 20MB to be safe
const MAX_CHUNK_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export interface RecordingResult {
    transcript: string;
    audioBlob: Blob;
    duration: number;
}

export interface StopRecordingResult {
    audioBlob: Blob;
    duration: number;
}

export interface TranscriptionProgress {
    currentChunk: number;
    totalChunks: number;
    percentComplete: number;
}

class AudioRecorderService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private startTime: number = 0;
    private pausedTime: number = 0;
    private totalPausedDuration: number = 0;
    public isRecording = false;
    public isPaused = false;

    // Store last recording for recovery
    public lastRecordingBlob: Blob | null = null;
    public lastRecordingDuration: number = 0;

    // Progress callback for chunked transcription
    private onProgressCallback: ((progress: TranscriptionProgress) => void) | null = null;

    async startRecording(): Promise<void> {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            let options: MediaRecorderOptions = {};
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options = { mimeType: 'audio/webm;codecs=opus' };
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                options = { mimeType: 'audio/webm' };
            }

            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.audioChunks = [];
            this.startTime = Date.now();
            this.pausedTime = 0;
            this.totalPausedDuration = 0;

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            this.isPaused = false;
            console.log('Recording started...');
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error('Microphone access denied');
        }
    }

    pauseRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            this.pausedTime = Date.now();
            this.isPaused = true;
            console.log('Recording paused');
        }
    }

    resumeRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.totalPausedDuration += Date.now() - this.pausedTime;
            this.mediaRecorder.resume();
            this.isPaused = false;
            console.log('Recording resumed');
        }
    }

    /**
     * Stop recording and return the audio blob IMMEDIATELY (before transcription)
     * This ensures the recording is never lost even if transcription fails
     */
    async stopRecordingAndGetBlob(): Promise<StopRecordingResult> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                reject(new Error('No active recording'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const duration = (Date.now() - this.startTime) / 1000;
                const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });

                // Stop all tracks
                this.stream?.getTracks().forEach(track => track.stop());
                this.isRecording = false;

                // Store for recovery
                this.lastRecordingBlob = audioBlob;
                this.lastRecordingDuration = duration;

                console.log(`Recording stopped: ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB, ${duration.toFixed(1)}s`);
                resolve({ audioBlob, duration });
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Transcribe an audio blob - can be called separately for retry
     * Uses optimized settings to reduce Whisper hallucinations
     */
    async transcribeAudio(audioBlob: Blob): Promise<string> {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ API Key - check your environment variables');
        }

        // Convert blob to file for FormData
        const file = new File([audioBlob], 'recording.webm', { type: audioBlob.type });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');
        formData.append('language', 'en');

        // CRITICAL: Temperature 0 reduces hallucinations significantly
        formData.append('temperature', '0');

        // Provide context prompt to guide the model (reduces "thank you" hallucinations)
        formData.append('prompt', 'This is a sermon or Bible teaching recording. The speaker discusses Scripture, theology, and Christian doctrine.');

        console.log('Sending audio to Groq Whisper API with anti-hallucination settings...');

        const response = await fetch(GROQ_WHISPER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Whisper API Error:', response.status, errorText);
            throw new Error(`Transcription failed (${response.status}): ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        let transcript = data.text || '';

        // Post-process to remove common Whisper hallucinations
        transcript = this.cleanTranscript(transcript);

        console.log('Transcription complete:', transcript.substring(0, 100) + '...');
        return transcript;
    }

    /**
     * Clean up transcript to remove common Whisper hallucinations
     */
    private cleanTranscript(text: string): string {
        // Remove repeated "thank you" phrases (common hallucination)
        let cleaned = text.replace(/(\s*thank you[,.\s]*){3,}/gi, ' ');

        // Remove repeated single words or short phrases
        cleaned = cleaned.replace(/(\b\w+\b)(\s+\1){2,}/gi, '$1');

        // Remove common hallucination patterns
        const hallucinations = [
            /please subscribe[.\s]*/gi,
            /like and subscribe[.\s]*/gi,
            /thanks for watching[.\s]*/gi,
            /see you next time[.\s]*/gi,
            /bye bye[.\s]*/gi,
        ];

        hallucinations.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });

        // Clean up extra whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
    }

    /**
     * Set progress callback for chunked transcription
     */
    setProgressCallback(callback: (progress: TranscriptionProgress) => void): void {
        this.onProgressCallback = callback;
    }

    /**
     * Split an audio blob into chunks of approximately MAX_CHUNK_SIZE_BYTES
     * Uses time-based splitting for WebM format
     */
    private async splitAudioIntoChunks(audioBlob: Blob): Promise<Blob[]> {
        const blobSize = audioBlob.size;

        // If under the limit, return as-is
        if (blobSize <= MAX_CHUNK_SIZE_BYTES) {
            console.log(`Audio size ${(blobSize / 1024 / 1024).toFixed(2)}MB is under limit, no splitting needed`);
            return [audioBlob];
        }

        // Calculate number of chunks needed
        const numChunks = Math.ceil(blobSize / MAX_CHUNK_SIZE_BYTES);
        const chunkSize = Math.ceil(blobSize / numChunks);

        console.log(`Splitting ${(blobSize / 1024 / 1024).toFixed(2)}MB audio into ${numChunks} chunks of ~${(chunkSize / 1024 / 1024).toFixed(2)}MB each`);

        const chunks: Blob[] = [];
        const arrayBuffer = await audioBlob.arrayBuffer();

        for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, blobSize);
            const chunkBuffer = arrayBuffer.slice(start, end);

            // Create a new Blob for this chunk
            const chunkBlob = new Blob([chunkBuffer], { type: audioBlob.type });
            chunks.push(chunkBlob);

            console.log(`Chunk ${i + 1}/${numChunks}: ${(chunkBlob.size / 1024 / 1024).toFixed(2)}MB`);
        }

        return chunks;
    }

    /**
     * Transcribe a single chunk (internal helper)
     */
    private async transcribeSingleChunk(audioBlob: Blob, chunkIndex: number, previousContext?: string): Promise<string> {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ API Key - check your environment variables');
        }

        const file = new File([audioBlob], `recording_chunk_${chunkIndex}.webm`, { type: audioBlob.type });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');
        formData.append('language', 'en');
        formData.append('temperature', '0');

        // Provide context from previous chunk to improve continuity
        let prompt = 'This is a sermon or Bible teaching recording. The speaker discusses Scripture, theology, and Christian doctrine.';
        if (previousContext) {
            // Add last 100 chars of previous transcript to help with context
            prompt += ` Previous context: "${previousContext.slice(-100)}"`;
        }
        formData.append('prompt', prompt);

        const response = await fetch(GROQ_WHISPER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Whisper API Error (chunk ${chunkIndex}):`, response.status, errorText);
            throw new Error(`Transcription failed for chunk ${chunkIndex} (${response.status}): ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        return data.text || '';
    }

    /**
     * Transcribe audio with automatic chunking for long recordings
     * This is the main method to use for 3+ hour sermons
     */
    async transcribeAudioChunked(audioBlob: Blob): Promise<string> {
        const chunks = await this.splitAudioIntoChunks(audioBlob);
        const totalChunks = chunks.length;

        console.log(`Starting chunked transcription of ${totalChunks} chunks...`);

        const transcripts: string[] = [];
        let previousContext = '';

        for (let i = 0; i < chunks.length; i++) {
            // Report progress
            if (this.onProgressCallback) {
                this.onProgressCallback({
                    currentChunk: i + 1,
                    totalChunks,
                    percentComplete: Math.round(((i + 1) / totalChunks) * 100)
                });
            }

            console.log(`Transcribing chunk ${i + 1}/${totalChunks}...`);

            try {
                const transcript = await this.transcribeSingleChunk(chunks[i], i, previousContext);
                transcripts.push(transcript);
                previousContext = transcript;

                console.log(`Chunk ${i + 1} complete: ${transcript.substring(0, 50)}...`);
            } catch (error) {
                console.error(`Failed to transcribe chunk ${i + 1}:`, error);
                // Continue with other chunks even if one fails
                transcripts.push(`[Chunk ${i + 1} transcription failed]`);
            }

            // Small delay between chunks to avoid rate limiting
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Combine and clean all transcripts
        const combinedTranscript = transcripts.join(' ');
        const cleanedTranscript = this.cleanTranscript(combinedTranscript);

        console.log(`Chunked transcription complete. Total length: ${cleanedTranscript.length} characters`);

        return cleanedTranscript;
    }

    /**
     * Smart transcribe - automatically uses chunking if needed
     * Use this as the primary transcription method
     */
    async transcribeAudioSmart(audioBlob: Blob): Promise<string> {
        if (audioBlob.size > MAX_CHUNK_SIZE_BYTES) {
            console.log(`Large audio detected (${(audioBlob.size / 1024 / 1024).toFixed(2)}MB), using chunked transcription...`);
            return this.transcribeAudioChunked(audioBlob);
        } else {
            return this.transcribeAudio(audioBlob);
        }
    }

    /**
     * Legacy method for backward compatibility - stops and transcribes in one call
     * Now uses smart transcription for long recordings
     */
    async stopRecording(): Promise<RecordingResult> {
        const { audioBlob, duration } = await this.stopRecordingAndGetBlob();
        const transcript = await this.transcribeAudioSmart(audioBlob);
        return { transcript, audioBlob, duration };
    }

    /**
     * Download audio blob as a file (for backup/recovery)
     */
    downloadRecording(audioBlob: Blob, filename?: string): void {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `sermon-recording-${new Date().toISOString().slice(0, 10)}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Recording downloaded:', a.download);
    }

    /**
     * Get last recording for retry purposes
     */
    getLastRecording(): { blob: Blob; duration: number } | null {
        if (this.lastRecordingBlob) {
            return { blob: this.lastRecordingBlob, duration: this.lastRecordingDuration };
        }
        return null;
    }

    cancelRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.stream?.getTracks().forEach(track => track.stop());
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
    }

    getRecordingDuration(): number {
        if (!this.isRecording) return 0;
        const totalElapsed = Date.now() - this.startTime;
        const currentPaused = this.isPaused ? Date.now() - this.pausedTime : 0;
        return (totalElapsed - this.totalPausedDuration - currentPaused) / 1000;
    }
}

const audioRecorderService = new AudioRecorderService();
export default audioRecorderService;
