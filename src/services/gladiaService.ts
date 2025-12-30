export class GladiaService {
    private socket: WebSocket | null = null;
    public isConnected = false;
    public onTranscript: ((text: string) => void) | null = null;
    public onInterim: ((text: string) => void) | null = null;
    public onError: ((error: any) => void) | null = null;
    private mediaRecorder: MediaRecorder | null = null;

    start() {
        const apiKey = process.env.NEXT_PUBLIC_GLADIA_API_KEY;
        if (!apiKey) {
            console.error("Gladia: Missing API Key");
            if (this.onError) this.onError("Missing Gladia API Key");
            return;
        }

        try {
            console.log("Gladia: Connecting...");
            this.socket = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');

            this.socket.onopen = () => {
                console.log("Gladia: Connected");
                this.isConnected = true;

                const configuration = {
                    x_gladia_key: apiKey,
                    language_behaviour: 'automatic single language',
                    // encoding removed to allow auto-detection or raw stream
                };
                this.socket?.send(JSON.stringify(configuration));

                this.startMicrophone();
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.error) {
                    console.error("Gladia API Error:", data.error);
                }
                if (data.type === 'transcript') {
                    console.log("Gladia Rx:", data.type, data.transcription, data.confidence);
                    if (data.transcription && this.onTranscript) {
                        // Use confidence or final flag if available (V1 checks confidence)
                        if ((data.confidence && data.confidence > 0.5) || (data.type === 'final')) {
                            this.onTranscript(data.transcription);
                        } else if (this.onInterim) {
                            this.onInterim(data.transcription);
                        }
                    }
                } else {
                    console.log("Gladia Msg:", data);
                }
            };

            this.socket.onerror = (error) => {
                console.error("Gladia Socket Error:", error);
                if (this.onError) this.onError(error);
            };

            this.socket.onclose = (ev) => {
                console.log("Gladia: Closed", ev.code, ev.reason);
                this.isConnected = false;
            }

        } catch (err) {
            console.error("Gladia Init Error:", err);
            if (this.onError) this.onError(err);
        }
    }

    async startMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Detect mimeType if supported
            let options = {};
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options = { mimeType: 'audio/webm;codecs=opus' };
            }
            this.mediaRecorder = new MediaRecorder(stream, options);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
                    const reader = new FileReader();
                    reader.readAsDataURL(event.data);
                    reader.onloadend = () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        this.socket?.send(JSON.stringify({ frames: base64Audio }));
                    };
                }
            };

            this.mediaRecorder.start(500); // 500ms chunks
        } catch (err) {
            console.error("Gladia Mic Error:", err);
            if (this.onError) this.onError("Microphone access denied");
        }
    }

    stop() {
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        if (this.socket) {
            this.socket.close();
        }
        this.isConnected = false;
    }
}

const gladiaService = new GladiaService();
export default gladiaService;
