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
}

const gladiaService = new GladiaService();
export default gladiaService;
