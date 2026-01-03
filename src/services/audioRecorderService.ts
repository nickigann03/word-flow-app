/**
 * Audio Recorder Service
 * Records audio and transcribes using Groq Whisper API
 */

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export interface RecordingResult {
    transcript: string;
    audioBlob: Blob;
    duration: number;
}

class AudioRecorderService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private startTime: number = 0;
    public isRecording = false;

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

    async stopRecording(): Promise<RecordingResult> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                reject(new Error('No active recording'));
                return;
            }

            this.mediaRecorder.onstop = async () => {
                const duration = (Date.now() - this.startTime) / 1000;
                const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });

                // Stop all tracks
                this.stream?.getTracks().forEach(track => track.stop());
                this.isRecording = false;

                try {
                    // Transcribe the audio
                    const transcript = await this.transcribeAudio(audioBlob);
                    resolve({ transcript, audioBlob, duration });
                } catch (error) {
                    console.error('Transcription failed:', error);
                    reject(error);
                }
            };

            this.mediaRecorder.stop();
        });
    }

    cancelRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.stream?.getTracks().forEach(track => track.stop());
        this.audioChunks = [];
        this.isRecording = false;
    }

    private async transcribeAudio(audioBlob: Blob): Promise<string> {
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ API Key');
        }

        // Convert blob to file for FormData
        const file = new File([audioBlob], 'recording.webm', { type: audioBlob.type });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');
        formData.append('language', 'en');

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
            throw new Error(`Transcription failed: ${response.status}`);
        }

        const data = await response.json();
        return data.text || '';
    }

    getRecordingDuration(): number {
        if (!this.isRecording) return 0;
        return (Date.now() - this.startTime) / 1000;
    }
}

const audioRecorderService = new AudioRecorderService();
export default audioRecorderService;
