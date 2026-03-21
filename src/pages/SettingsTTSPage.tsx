import { useEffect, useState } from 'react';
import {
  Box, Button, Container, FormControl, FormLabel, Heading, Input, Select, VStack, Table, Thead, Tbody, Tr, Th, Td, useToast, HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

interface TTSConfig {
  id: string;
  name: string;
  engine: string;
  voice_name: string;
}

export default function SettingsTTSPage() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<TTSConfig[]>([]);
  const [name, setName] = useState('');
  const [engine, setEngine] = useState('edge_tts');
  const [voiceName, setVoiceName] = useState('ko-KR-SunHiNeural');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => client.get('/tts-configs').then((r) => setConfigs(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post('/tts-configs', { name, engine, voice_name: voiceName });
      toast({ title: t('settings.created'), status: 'success', duration: 2000 });
      setName('');
      load();
    } catch {
      toast({ title: t('settings.error'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await client.delete(`/tts-configs/${id}`);
    load();
  };

  return (
    <Container maxW="4xl" py={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">{t('settings.ttsTitle')}</Heading>
        <HStack>
          <Button size="sm" variant="outline" onClick={() => navigate('/settings/llm')}>LLM</Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/settings/asr')}>ASR</Button>
          <Button size="sm" onClick={() => navigate('/dashboard')}>{t('common.dashboard')}</Button>
        </HStack>
      </HStack>

      <Box as="form" onSubmit={handleCreate} mb={8} p={4} borderWidth={1} borderRadius="lg">
        <VStack spacing={3}>
          <FormControl isRequired>
            <FormLabel>{t('settings.configName')}</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My TTS Config" />
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.engine')}</FormLabel>
            <Select value={engine} onChange={(e) => setEngine(e.target.value)}>
              <option value="edge_tts">Edge TTS</option>
              <option value="stub">Stub (Silent)</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.voice')}</FormLabel>
            <Input value={voiceName} onChange={(e) => setVoiceName(e.target.value)} />
          </FormControl>
          <Button type="submit" colorScheme="blue" w="100%" isLoading={loading}>{t('settings.addConfig')}</Button>
        </VStack>
      </Box>

      <Table size="sm">
        <Thead><Tr><Th>{t('settings.configName')}</Th><Th>{t('settings.engine')}</Th><Th>{t('settings.voice')}</Th><Th></Th></Tr></Thead>
        <Tbody>
          {configs.map((c) => (
            <Tr key={c.id}>
              <Td>{c.name}</Td><Td>{c.engine}</Td><Td>{c.voice_name}</Td>
              <Td><Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(c.id)}>{t('common.delete')}</Button></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Container>
  );
}
