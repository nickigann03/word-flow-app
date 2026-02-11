import { useRef } from 'react';

export class GladiaService {
    private socket: WebSocket | null = null;
    public isConnected = false;
    public onTranscript: ((text: string) => void) | null = null;
    public onInterim: ((text: string) => void) | null = null;
    public onError: ((error: any) => void) | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private retries = 0;

    async start() {
        // Ensure clean state before starting
        this.stop();

        const apiKey = process.env.NEXT_PUBLIC_GLADIA_API_KEY;
        if (!apiKey) {
            console.error("Gladia: Missing API Key");
            if (this.onError) this.onError("Missing Gladia API Key");
            return;
        }

        try {
            console.log("Gladia: Requesting Mic Access...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Gladia: Mic Access Granted. Tracks:", stream.getAudioTracks().length);

            // Get correct sample rate from the stream
            const track = stream.getAudioTracks()[0];
            const sampleRate = track.getSettings().sampleRate || 48000;
            console.log("Gladia: Detected Sample Rate:", sampleRate);

            // Initialize MediaRecorder
            let options: MediaRecorderOptions = {};
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options = { mimeType: 'audio/webm;codecs=opus' };
            }
            console.log("Gladia: Creating MediaRecorder with options:", options);
            this.mediaRecorder = new MediaRecorder(stream, options);

            // Setup audio data handling
            let chunkCount = 0;
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
                    const reader = new FileReader();
                    reader.readAsDataURL(event.data);
                    reader.onloadend = () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        chunkCount++;
                        // Log every 50th chunk to verify flow without spamming
                        if (chunkCount % 50 === 0) console.log(`Gladia: Sending chunk #${chunkCount} (${base64Audio.length} bytes)`);
                        this.socket?.send(JSON.stringify({ frames: base64Audio }));
                    };
                }
            };

            // Connect to WebSocket AFTER microphone is ready
            console.log("Gladia: Connecting Socket...");
            this.socket = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');

            this.socket.onopen = () => {
                console.log("Gladia: Connected");
                this.isConnected = true;
                this.retries = 0;

                const configuration = {
                    x_gladia_key: apiKey,
                    language_behaviour: 'automatic single language',
                    sample_rate: sampleRate, // Use real sample rate
                    frames_format: 'base64',
                };
                console.log("Gladia: Sending config", configuration);
                this.socket?.send(JSON.stringify(configuration));

                // Start recording
                this.mediaRecorder?.start(500); // 500ms chunks
                console.log("Gladia: MediaRecorder started");
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'transcript' || data.type === 'final') {
                    console.log("Gladia Rx:", data.type, data.transcription);
                    if (this.onTranscript) this.onTranscript(data.transcription);
                } else if (data.type === 'partial' && this.onInterim) {
                    this.onInterim(data.transcription);
                } else if (data.error) {
                    console.error("Gladia API Error:", data.error);
                }
            };

            this.socket.onerror = (error) => {
                console.error("Gladia Socket Error:", error);
                if (this.onError) this.onError(error);
            };

            this.socket.onclose = (ev) => {
                console.log("Gladia: Closed", ev.code, ev.reason);
                this.isConnected = false;

                if (ev.code === 1005) {
                    console.log("Gladia: Attempting reconnect (1005)...");
                    setTimeout(() => { if (!this.isConnected) this.start(); }, 1000);
                } else if (ev.code === 4129) {
                    if (this.retries < 1) {
                        console.warn("Gladia: Max sessions 4129. Retry (1/1)...");
                        this.retries++;
                        setTimeout(() => { if (!this.isConnected) this.start(); }, 3000);
                    } else {
                        console.error("Gladia: Max sessions reached (Fatal).");
                        if (this.onError) this.onError("Error 4129: Max sessions reached");
                    }
                }
            }

        } catch (err) {
            console.error("Gladia Mic Error:", err);
            if (this.onError) this.onError("Microphone access denied: " + (err as any).message);
        }
    }

    stop() {
        console.log("Gladia: Stopping service...");
        if (this.mediaRecorder) {
            if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            console.log("Gladia: Recorder stopped");
        }
        if (this.socket) {
            this.socket.close();
        }
        this.isConnected = false;
    }

    /**
     * Upload and transcribe an audio file using Gladia V2 Async API
     */
    async transcribeFile(file: File, onProgress?: (status: string) => void): Promise<string> {
        const apiKey = process.env.NEXT_PUBLIC_GLADIA_API_KEY;
        if (!apiKey) throw new Error("Missing Gladia API Key");

        try {
            // 1. Upload the file
            if (onProgress) onProgress('Uploading...');
            const formData = new FormData();
            formData.append('audio', file); // Gladia v2 expects 'audio' or 'video'

            const uploadRes = await fetch('https://api.gladia.io/v2/upload', {
                method: 'POST',
                headers: { 'x-gladia-key': apiKey },
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                throw new Error(`Upload failed: ${err}`);
            }

            const uploadData = await uploadRes.json();
            const audioUrl = uploadData.audio_url;

            // 2. Start Transcription
            if (onProgress) onProgress('Queuing transcription...');
            const transcribeRes = await fetch('https://api.gladia.io/v2/transcription', {
                method: 'POST',
                headers: {
                    'x-gladia-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audio_url: audioUrl,
                    diarization: true,
                    summarization: true
                })
            });

            if (!transcribeRes.ok) {
                const err = await transcribeRes.text();
                throw new Error(`Transcription start failed: ${err}`);
            }

            const transcribeData = await transcribeRes.json();
            const resultUrl = transcribeData.result_url;

            // 3. Poll for results
            if (onProgress) onProgress('Transcribing (this may take a while)...');

            while (true) {
                await new Promise(r => setTimeout(r, 2000)); // Poll every 2s

                const pollRes = await fetch(resultUrl, {
                    headers: { 'x-gladia-key': apiKey }
                });
                const pollData = await pollRes.json();

                if (pollData.status === 'done') {
                    // Return full transcript or combined parts
                    // Gladia V2 returns 'result.transcription.full_transcript' usually
                    return pollData.result.transcription.full_transcript;
                } else if (pollData.status === 'error') {
                    throw new Error(`Transcription failed: ${JSON.stringify(pollData.error)}`);
                }

                // If queued or processing, continue loop
            }

        } catch (error) {
            console.error('Gladia Async Error:', error);
            throw error;
        }
    }
}

const gladiaService = new GladiaService();
export default gladiaService;
