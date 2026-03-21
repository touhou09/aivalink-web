import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Button, Flex, HStack, Input, Text, VStack,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { VTuberWebSocket } from '../lib/websocket';
import Live2DCanvas from '../components/Live2DCanvas';

function float32ToWav(float32: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = float32.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return buffer;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function VTuberPage() {
  const { t } = useTranslation();
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [ws, setWs] = useState<VTuberWebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [currentResponse, setCurrentResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [characterInfo, setCharacterInfo] = useState<{ name: string; live2d_model?: string } | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const vadRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  const connectWs = useCallback(async (): Promise<(() => void) | undefined> => {
    if (!characterId) return undefined;
    const token = localStorage.getItem('access_token') || '';

    // Find running instance for this character
    let instanceId: string;
    try {
      const res = await client.get('/instances');
      const instances = Array.isArray(res.data) ? res.data : res.data.items || [];
      const instance = instances.find((i: any) => i.character_id === characterId && i.status === 'running');
      if (!instance) {
        console.error('No running instance found for character:', characterId);
        return undefined;
      }
      instanceId = instance.id;
    } catch {
      console.error('Failed to fetch instances');
      return undefined;
    }

    const socket = new VTuberWebSocket(instanceId, token);

    socket.on('connected', (msg) => {
      console.log('[VTuber] connected:', JSON.stringify(msg.data));
      setConnected(true);
      setCharacterInfo(msg.data.character as { name: string; live2d_model?: string });
    });

    socket.on('emotion', (msg) => {
      setCurrentEmotion(msg.data.emotion as string);
    });

    socket.on('text-chunk', (msg) => {
      setCurrentResponse((prev) => prev + (msg.data.text as string));
    });

    socket.on('text-complete', (msg) => {
      const fullText = msg.data.full_text as string;
      setMessages((prev) => [...prev, { role: 'assistant', text: fullText }]);
      setCurrentResponse('');
    });

    socket.on('audio-chunk', (msg) => {
      const audioB64 = msg.data.audio as string;
      if (audioB64 && !msg.data.is_final) {
        playAudio(audioB64);
      }
    });

    socket.on('audio-binary', (msg) => {
      const blob = msg.data.audio as Blob;
      blob.arrayBuffer().then((buffer) => {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          const node = audioContextRef.current.createAnalyser();
          node.fftSize = 256;
          analyserRef.current = node;
          setAnalyser(node);
        }
        audioContextRef.current.decodeAudioData(buffer).then((decoded) => {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = decoded;
          if (analyserRef.current) {
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current!.destination);
          } else {
            source.connect(audioContextRef.current!.destination);
          }
          source.start();
        }).catch(() => {});
      }).catch(() => {});
    });

    socket.on('user-transcript', (msg) => {
      setMessages((prev) => [...prev, { role: 'user', text: msg.data.text as string }]);
    });

    socket.connect();
    setWs(socket);

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [characterId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    connectWs().then((c) => { cleanup = c; });
    return () => { cleanup?.(); };
  }, [connectWs]);

  const playAudio = (base64: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        const node = audioContextRef.current.createAnalyser();
        node.fftSize = 256;
        analyserRef.current = node;
        setAnalyser(node);
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      audioContextRef.current.decodeAudioData(bytes.buffer.slice(0)).then((buffer) => {
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = buffer;
        if (analyserRef.current) {
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current!.destination);
        } else {
          source.connect(audioContextRef.current!.destination);
        }
        source.start();
      }).catch(() => {});
    } catch {
      // ignore audio errors
    }
  };

  const handleSend = () => {
    if (!input.trim() || !ws) return;
    setMessages((prev) => [...prev, { role: 'user', text: input }]);
    ws.sendTextInput(input);
    setInput('');
  };

  const handleInterrupt = () => {
    ws?.sendInterrupt();
    setCurrentResponse('');
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (vadRef.current) {
        vadRef.current.scriptNode?.disconnect();
        vadRef.current.source?.disconnect();
        vadRef.current.audioCtx?.close();
        vadRef.current.stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        vadRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    try {
      let stream: MediaStream;
      if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        // Legacy fallback for HTTP or older browsers
        const legacyGetUserMedia = (navigator as any).getUserMedia
          || (navigator as any).webkitGetUserMedia
          || (navigator as any).mozGetUserMedia;
        if (!legacyGetUserMedia) {
          alert('이 브라우저/환경에서 마이크를 사용할 수 없습니다.\n\nHTTPS 또는 localhost에서 접속하거나,\nChrome://flags에서 insecure origin 허용을 설정해주세요.');
          return;
        }
        stream = await new Promise((resolve, reject) => {
          legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject);
        });
      }

      // Set up volume-based VAD using Web Audio API
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);

      let audioChunks: Float32Array[] = [];
      let silenceFrames = 0;
      let isSpeaking = false;
      const SILENCE_THRESHOLD = 0.01;
      const SILENCE_TIMEOUT = 25; // ~25 frames of silence to end

      scriptNode.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        const rms = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);

        if (rms > SILENCE_THRESHOLD) {
          isSpeaking = true;
          silenceFrames = 0;
          audioChunks.push(new Float32Array(data));
        } else if (isSpeaking) {
          audioChunks.push(new Float32Array(data));
          silenceFrames++;
          if (silenceFrames >= SILENCE_TIMEOUT) {
            // Speech ended — send audio
            const totalLength = audioChunks.reduce((s, c) => s + c.length, 0);
            const merged = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of audioChunks) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }
            const wavBuffer = float32ToWav(merged, audioCtx.sampleRate);
            const base64 = btoa(String.fromCharCode(...new Uint8Array(wavBuffer)));
            ws?.sendAudioInput(base64);
            console.log(`[VAD] Speech sent: ${(totalLength / 16000).toFixed(1)}s`);

            // Reset
            audioChunks = [];
            silenceFrames = 0;
            isSpeaking = false;
          }
        }
      };

      // Store cleanup refs
      vadRef.current = { stream, audioCtx, scriptNode, source };
      setIsRecording(true);
    } catch (err) {
      console.error('Mic init failed:', err);
      // List available devices for debugging
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        console.log('Audio input devices:', audioInputs.map(d => `${d.label || 'unnamed'} (${d.deviceId.slice(0,8)})`));
        if (audioInputs.length === 0) {
          alert('No microphone found on this device.');
        }
      } catch { /* */ }
    }
  };

  return (
    <Flex h="100vh">
      {/* Live2D Canvas Area - 70% */}
      <Box flex="7" bg="gray.900" position="relative">
        <Live2DCanvas modelUrl={characterInfo?.live2d_model} emotion={currentEmotion} audioAnalyser={analyser} />
        <Box position="absolute" top={4} left={4}>
          <Button size="sm" onClick={() => navigate('/dashboard')}>{t('vtuber.back')}</Button>
        </Box>
        {characterInfo && (
          <Box position="absolute" top={4} right={4} bg="blackAlpha.700" color="white" px={3} py={1} borderRadius="md">
            <Text fontSize="sm">{characterInfo.name}</Text>
          </Box>
        )}
        {!connected && (
          <Flex position="absolute" inset={0} align="center" justify="center" bg="blackAlpha.600">
            <Text color="white" fontSize="lg">{t('vtuber.connecting')}</Text>
          </Flex>
        )}
      </Box>

      {/* Chat Panel - 30% */}
      <VStack flex="3" h="100vh" borderLeftWidth={1}>
        <Box flex={1} w="100%" overflowY="auto" p={4}>
          <VStack spacing={3} align="stretch">
            {messages.map((msg, i) => (
              <Box
                key={i}
                alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                bg={msg.role === 'user' ? 'blue.500' : 'gray.100'}
                color={msg.role === 'user' ? 'white' : 'black'}
                px={3}
                py={2}
                borderRadius="lg"
                maxW="85%"
              >
                <Text fontSize="sm">{msg.text}</Text>
              </Box>
            ))}
            {currentResponse && (
              <Box alignSelf="flex-start" bg="gray.100" px={3} py={2} borderRadius="lg" maxW="85%">
                <Text fontSize="sm">{currentResponse}</Text>
              </Box>
            )}
            <div ref={chatEndRef} />
          </VStack>
        </Box>

        <HStack w="100%" p={3} borderTopWidth={1}>
          <Button
            size="sm"
            colorScheme={isRecording ? 'red' : 'gray'}
            onClick={toggleRecording}
          >
            {isRecording ? t('vtuber.stopMic') : t('vtuber.mic')}
          </Button>
          <Input
            size="sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('vtuber.typeMessage')}
          />
          <Button size="sm" colorScheme="blue" onClick={handleSend}>{t('vtuber.sendMessage')}</Button>
          <Button size="sm" colorScheme="orange" onClick={handleInterrupt}>{t('vtuber.interrupt')}</Button>
        </HStack>
      </VStack>
    </Flex>
  );
}
