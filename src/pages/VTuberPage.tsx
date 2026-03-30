import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Button, Flex, HStack, Input, Text, VStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Live2DCanvas from '../components/Live2DCanvas';
import { useAiState } from '../context/ai-state-context';
import { useWebSocket } from '../context/websocket-context';
import { useVAD } from '../context/vad-context';

export default function VTuberPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { aiState } = useAiState();
  const {
    wsState, messages, currentResponse, characterInfo,
    audioAnalyser, sendTextInput, sendInterrupt,
  } = useWebSocket();
  const { micOn, startMic, stopMic } = useVAD();

  const [input, setInput] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // Listen for emotion events from WebSocket handler
  useEffect(() => {
    const handler = (e: Event) => {
      setCurrentEmotion((e as CustomEvent).detail as string);
    };
    window.addEventListener('aiva:emotion', handler);
    return () => window.removeEventListener('aiva:emotion', handler);
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendTextInput(input);
    setInput('');
  }, [input, sendTextInput]);

  const handleInterrupt = useCallback(() => {
    sendInterrupt();
  }, [sendInterrupt]);

  const toggleMic = useCallback(async () => {
    if (micOn) {
      stopMic();
    } else {
      await startMic();
    }
  }, [micOn, startMic, stopMic]);

  const connected = wsState === 'open';

  return (
    <Flex h="100vh">
      {/* Live2D Canvas Area - 70% */}
      <Box flex="7" bg="gray.900" position="relative">
        <Live2DCanvas
          modelUrl={characterInfo?.live2d_model}
          emotion={currentEmotion}
          audioAnalyser={audioAnalyser}
        />
        <Box position="absolute" top={4} left={4}>
          <Button size="sm" onClick={() => navigate('/dashboard')}>
            {t('vtuber.back')}
          </Button>
        </Box>
        {characterInfo && (
          <Box
            position="absolute"
            top={4}
            right={4}
            bg="blackAlpha.700"
            color="white"
            px={3}
            py={1}
            borderRadius="md"
          >
            <Text fontSize="sm">{characterInfo.name}</Text>
          </Box>
        )}
        {/* AI State indicator */}
        {connected && aiState !== 'idle' && (
          <Box
            position="absolute"
            bottom={4}
            left={4}
            bg="blackAlpha.700"
            color="white"
            px={3}
            py={1}
            borderRadius="md"
          >
            <Text fontSize="xs">{aiState}</Text>
          </Box>
        )}
        {!connected && (
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            bg="blackAlpha.600"
          >
            <Text color="white" fontSize="lg">
              {t('vtuber.connecting')}
            </Text>
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
              <Box
                alignSelf="flex-start"
                bg="gray.100"
                px={3}
                py={2}
                borderRadius="lg"
                maxW="85%"
              >
                <Text fontSize="sm">{currentResponse}</Text>
              </Box>
            )}
            <div ref={chatEndRef} />
          </VStack>
        </Box>

        <HStack w="100%" p={3} borderTopWidth={1}>
          <Button
            size="sm"
            colorScheme={micOn ? 'red' : 'gray'}
            onClick={toggleMic}
          >
            {micOn ? t('vtuber.stopMic') : t('vtuber.mic')}
          </Button>
          <Input
            size="sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('vtuber.typeMessage')}
          />
          <Button size="sm" colorScheme="blue" onClick={handleSend}>
            {t('vtuber.sendMessage')}
          </Button>
          <Button size="sm" colorScheme="orange" onClick={handleInterrupt}>
            {t('vtuber.interrupt')}
          </Button>
        </HStack>
      </VStack>
    </Flex>
  );
}
