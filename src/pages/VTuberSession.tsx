import { AiStateProvider } from '../context/ai-state-context';
import { WebSocketProvider } from '../services/websocket-handler';
import { VADProvider } from '../context/vad-context';
import VTuberPage from './VTuberPage';

/** Wraps VTuberPage with session-scoped providers (WS, VAD, AI state) */
export default function VTuberSession() {
  return (
    <AiStateProvider>
      <WebSocketProvider>
        <VADProvider>
          <VTuberPage />
        </VADProvider>
      </WebSocketProvider>
    </AiStateProvider>
  );
}
