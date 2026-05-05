import { useEffect, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Container, Heading, SimpleGrid, Text, VStack, Badge, HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { buildAgentNotification, notifyAgentEvent } from '../services/agentActivityNotifications';

interface Character {
  id: string;
  name: string;
  persona_prompt: string;
  llm_config_id: string | null;
  tts_config_id: string | null;
  asr_config_id: string | null;
}

interface Instance {
  id: string;
  character_id: string;
  status: string;
}

interface AgentState {
  id: string;
  character_id: string;
  status: string;
  current_activity: string | null;
  last_emotion: string;
  local_capability_mode: string;
  last_active_at: string | null;
}

interface AgentEvent {
  id: string;
  character_id: string;
  event_type: string;
  source: string;
  payload: Record<string, unknown>;
  summary: string | null;
  created_at: string;
}

function responseItems<T>(data: T[] | { items?: T[] }): T[] {
  return Array.isArray(data) ? data : data.items || [];
}

function eventLabelKey(eventType: string) {
  if (eventType === 'message.user') return 'dashboard.agentEvent.messageUser';
  if (eventType === 'message.assistant') return 'dashboard.agentEvent.messageAssistant';
  if (eventType === 'emotion.updated') return 'dashboard.agentEvent.emotionUpdated';
  if (eventType === 'memory.saved') return 'dashboard.agentEvent.memorySaved';
  if (eventType === 'session.connected') return 'dashboard.agentEvent.sessionConnected';
  if (eventType.startsWith('local.')) return 'dashboard.agentEvent.local';
  if (eventType.startsWith('tool.')) return 'dashboard.agentEvent.tool';
  return 'dashboard.agentEvent.default';
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const [agentEvents, setAgentEvents] = useState<Record<string, AgentEvent[]>>({});
  const seenAgentEventIds = useRef<Record<string, string>>({});
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      loadUser().catch(() => {});

      const [charactersResult, instancesResult] = await Promise.allSettled([
        client.get('/characters'),
        client.get('/instances'),
      ]);

      const nextCharacters = charactersResult.status === 'fulfilled'
        ? responseItems<Character>(charactersResult.value.data)
        : [];
      const nextInstances = instancesResult.status === 'fulfilled'
        ? responseItems<Instance>(instancesResult.value.data)
        : [];

      if (!active) return;
      setCharacters(nextCharacters);
      setInstances(nextInstances);

      const agentResults = await Promise.all(nextCharacters.map(async (char) => {
        const [stateResult, eventsResult] = await Promise.allSettled([
          client.get('/agents/' + char.id + '/state'),
          client.get('/agents/' + char.id + '/events?limit=3'),
        ]);

        return {
          characterId: char.id,
          state: stateResult.status === 'fulfilled' ? stateResult.value.data as AgentState : undefined,
          events: eventsResult.status === 'fulfilled' ? responseItems<AgentEvent>(eventsResult.value.data) : [],
        };
      }));

      if (!active) return;
      setAgentStates(Object.fromEntries(
        agentResults
          .filter((result) => result.state)
          .map((result) => [result.characterId, result.state as AgentState]),
      ));
      setAgentEvents(Object.fromEntries(
        agentResults.map((result) => [result.characterId, result.events]),
      ));
      agentResults.forEach((result) => {
        const latest = result.events[0];
        if (latest && !seenAgentEventIds.current[result.characterId]) {
          seenAgentEventIds.current[result.characterId] = latest.id;
        }
      });
    };

    loadDashboard().catch(() => {});
    return () => {
      active = false;
    };
  }, [loadUser]);

  useEffect(() => {
    if (characters.length === 0) return undefined;

    const intervalId = window.setInterval(async () => {
      const updates = await Promise.all(characters.map(async (char) => {
        try {
          const response = await client.get('/agents/' + char.id + '/events?limit=3');
          return { character: char, events: responseItems<AgentEvent>(response.data) };
        } catch {
          return { character: char, events: [] };
        }
      }));

      setAgentEvents((current) => ({
        ...current,
        ...Object.fromEntries(updates.map((update) => [update.character.id, update.events])),
      }));

      await Promise.all(updates.map(async (update) => {
        const latest = update.events[0];
        const previousEventId = seenAgentEventIds.current[update.character.id] || null;
        const notification = buildAgentNotification(update.character.name, latest, previousEventId);
        if (latest) {
          seenAgentEventIds.current[update.character.id] = latest.id;
        }
        if (notification) {
          await notifyAgentEvent(notification).catch(() => false);
        }
      }));
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [characters]);

  const getInstanceStatus = (charId: string) => {
    const inst = instances.find((i) => i.character_id === charId);
    return inst?.status || 'stopped';
  };

  const refreshInstances = async () => {
    const r = await client.get('/instances');
    setInstances(responseItems<Instance>(r.data));
  };

  const handleStart = async (charId: string) => {
    try {
      await client.post('/instances', { character_id: charId });
      await refreshInstances();
    } catch {
      // handle error
    }
  };

  const handleStop = async (charId: string) => {
    const inst = instances.find((i) => i.character_id === charId);
    if (inst) {
      await client.delete('/instances/' + inst.id);
      await refreshInstances();
    }
  };

  const formatEvent = (event: AgentEvent) => {
    const baseLabel = t(eventLabelKey(event.event_type), { defaultValue: event.event_type });
    const contentLength = event.payload?.content_length;
    if (typeof contentLength === 'number') {
      return t('dashboard.agentEvent.withContentLength', { label: baseLabel, count: contentLength });
    }
    return event.summary || baseLabel;
  };

  return (
    <Container maxW="6xl" py={8}>
      <HStack justify="space-between" mb={8}>
        <Heading size="lg">{t('dashboard.title')}</Heading>
        <HStack>
          <Button size="sm" variant="outline" onClick={() => navigate('/profile/edit')}>
            {t('dashboard.profile')}
          </Button>
          <Button size="sm" onClick={() => navigate('/settings/llm')}>{t('dashboard.settings')}</Button>
          <Button size="sm" variant="outline" onClick={() => { logout(); navigate('/login'); }}>
            {t('dashboard.logout')}
          </Button>
        </HStack>
      </HStack>

      <Box mb={8} p={5} borderWidth={1} borderRadius="lg">
        <HStack justify="space-between" align={{ base: 'start', md: 'center' }} spacing={4} flexDir={{ base: 'column', md: 'row' }}>
          <HStack spacing={4} align="center">
            <Avatar name={user?.display_name || user?.email || 'User'} src={user?.avatar_url || undefined} />
            <VStack align="start" spacing={1}>
              <Text fontWeight="semibold">{user?.display_name || t('profile.emptyName')}</Text>
              <Text fontSize="sm" color="gray.500">{user?.email || t('profile.emptyEmail')}</Text>
            </VStack>
          </HStack>
          <Button colorScheme="blue" variant="outline" onClick={() => navigate('/profile/edit')}>
            {t('profile.editCta')}
          </Button>
        </HStack>
      </Box>

      <HStack justify="space-between" mb={4}>
        <Heading size="md">{t('dashboard.characters')}</Heading>
        <Button colorScheme="blue" size="sm" onClick={() => navigate('/characters/new')}>
          {t('dashboard.newCharacter')}
        </Button>
      </HStack>

      {characters.length === 0 ? (
        <Box p={8} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="gray.500">{t('dashboard.noCharacters')}</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {characters.map((char) => {
            const status = getInstanceStatus(char.id);
            const agentState = agentStates[char.id];
            const events = agentEvents[char.id] || [];
            const emotion = agentState?.last_emotion || 'neutral';
            const emotionLabel = t('vtuber.emotion.' + emotion, { defaultValue: emotion });
            const localMode = agentState?.local_capability_mode || 'none';
            return (
              <Box key={char.id} p={5} borderWidth={1} borderRadius="lg">
                <VStack align="start" spacing={3}>
                  <HStack justify="space-between" w="100%">
                    <Heading size="sm">{char.name}</Heading>
                    <Badge colorScheme={status === 'running' ? 'green' : 'gray'}>
                      {status === 'running' ? t('dashboard.running') : t('dashboard.stopped')}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {char.persona_prompt}
                  </Text>
                  <Box w="100%" p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                    <VStack align="start" spacing={2}>
                      <HStack spacing={2} wrap="wrap">
                        <Badge colorScheme={agentState?.status === 'active' ? 'purple' : 'gray'}>
                          {t('dashboard.agentStatus', { status: agentState?.status || 'unknown' })}
                        </Badge>
                        <Badge colorScheme="purple">{emotionLabel}</Badge>
                        <Badge colorScheme={localMode === 'none' ? 'gray' : 'blue'}>
                          {t('dashboard.localCapability.' + localMode, { defaultValue: localMode })}
                        </Badge>
                      </HStack>
                      {agentState?.current_activity && (
                        <Text fontSize="xs" color="gray.600" noOfLines={1}>
                          {agentState.current_activity}
                        </Text>
                      )}
                      <Box w="100%">
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1}>
                          {t('dashboard.recentAgentActivity')}
                        </Text>
                        {events.length > 0 ? (
                          <VStack align="start" spacing={1}>
                            {events.map((event) => (
                              <Text key={event.id} fontSize="xs" color="gray.700" noOfLines={1}>
                                {formatEvent(event)}
                              </Text>
                            ))}
                          </VStack>
                        ) : (
                          <Text fontSize="xs" color="gray.500">
                            {t('dashboard.noAgentActivity')}
                          </Text>
                        )}
                      </Box>
                    </VStack>
                  </Box>
                  <HStack spacing={2}>
                    {status === 'running' ? (
                      <>
                        <Button size="sm" colorScheme="blue" onClick={() => navigate(`/vtuber/${char.id}`)}>
                          {t('dashboard.open')}
                        </Button>
                        <Button size="sm" colorScheme="red" variant="outline" onClick={() => handleStop(char.id)}>
                          {t('dashboard.stop')}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" colorScheme="green" onClick={() => handleStart(char.id)}>
                        {t('dashboard.start')}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => navigate(`/characters/${char.id}/edit`)}>
                      {t('dashboard.edit')}
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Container>
  );
}
