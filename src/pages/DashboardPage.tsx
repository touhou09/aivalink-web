import { useEffect, useState } from 'react';
import {
  Avatar, Box, Button, Container, Heading, SimpleGrid, Text, VStack, Badge, HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { useAuthStore } from '../stores/authStore';

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

export default function DashboardPage() {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser().catch(() => {});
    client.get('/characters').then((r) => setCharacters(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
    client.get('/instances').then((r) => setInstances(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
  }, [loadUser]);

  const getInstanceStatus = (charId: string) => {
    const inst = instances.find((i) => i.character_id === charId);
    return inst?.status || 'stopped';
  };

  const refreshInstances = async () => {
    const r = await client.get('/instances');
    setInstances(Array.isArray(r.data) ? r.data : r.data.items || []);
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
      await client.delete(`/instances/${inst.id}`);
      await refreshInstances();
    }
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
