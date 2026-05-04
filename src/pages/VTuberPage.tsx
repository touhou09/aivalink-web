import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Badge, Box, Button, Flex, HStack, Input, Text, VStack,
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
  const [lastCompanionCue, setLastCompanionCue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  useEffect(() => {
    const handler = (e: Event) => {
      setCurrentEmotion((e as CustomEvent).detail as string);
    };
    window.addEventListener('aiva:emotion', handler);
    return () => window.removeEventListener('aiva:emotion', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { text?: string };
      if (detail?.text) setLastCompanionCue(detail.text);
    };
    window.addEventListener('aiva:idle-reaction', handler);
    return () => window.removeEventListener('aiva:idle-reaction', handler);
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
  const emotionLabel = t(`vtuber.emotion.${currentEmotion}`, { defaultValue: currentEmotion });

  return (
    <Flex h="100vh">
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

      <VStack flex="3" h="100vh" borderLeftWidth={1} spacing={0} align="stretch">
        <Box w="100%" p={4} borderBottomWidth={1} bg="gray.50">
          <HStack justify="space-between" align="center">
            <Text fontWeight="semibold">{t('vtuber.partnerPanelTitle')}</Text>
            <Badge colorScheme="purple">{emotionLabel}</Badge>
          </HStack>
          <Text fontSize="sm" color="gray.600" mt={1}>
            {characterInfo
              ? t('vtuber.partnerPanelSubtitle', { name: characterInfo.name })
              : t('vtuber.partnerPanelWaiting')}
          </Text>
          <HStack mt={3} spacing={2}>
            <Badge colorScheme={connected ? 'green' : 'gray'}>
              {connected ? t('vtuber.connectionOnline') : t('vtuber.connectionOffline')}
            </Badge>
            <Badge colorScheme={micOn ? 'red' : 'gray'}>
              {micOn ? t('vtuber.micOn') : t('vtuber.micOff')}
            </Badge>
          </HStack>
          {lastCompanionCue && (
            <Box mt={3} borderLeftWidth={3} borderColor="purple.300" pl={3}>
              <Text fontSize="xs" color="gray.500">{t('vtuber.lastCompanionCue')}</Text>
              <Text fontSize="sm" color="gray.700" noOfLines={2}>{lastCompanionCue}</Text>
            </Box>
          )}
        </Box>

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
