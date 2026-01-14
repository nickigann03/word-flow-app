/**
 * Audio Recorder Service
 * Records audio and transcribes using Groq Whisper API
 * 
 * KEY FEATURE: Saves audio blob BEFORE transcription to prevent data loss
 */

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export interface RecordingResult {
    transcript: string;
    audioBlob: Blob;
    duration: number;
}

export interface StopRecordingResult {
    audioBlob: Blob;
    duration: number;
}

class AudioRecorderService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private startTime: number = 0;
    public isRecording = false;

    // Store last recording for recovery
    public lastRecordingBlob: Blob | null = null;
    public lastRecordingDuration: number = 0;

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

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            console.log('Recording started...');
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error('Microphone access denied');
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

        console.log('Sending audio to Groq Whisper API...');

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
        console.log('Transcription complete:', data.text?.substring(0, 100) + '...');
        return data.text || '';
    }

    /**
     * Legacy method for backward compatibility - stops and transcribes in one call
     */
    async stopRecording(): Promise<RecordingResult> {
        const { audioBlob, duration } = await this.stopRecordingAndGetBlob();
        const transcript = await this.transcribeAudio(audioBlob);
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
    }

    getRecordingDuration(): number {
        if (!this.isRecording) return 0;
        return (Date.now() - this.startTime) / 1000;
    }
}

const audioRecorderService = new AudioRecorderService();
export default audioRecorderService;
