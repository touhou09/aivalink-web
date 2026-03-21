import { useEffect, useState } from 'react';
import {
  Box, Button, Container, FormControl, FormLabel, Heading, Input, Select, VStack, Table, Thead, Tbody, Tr, Th, Td, useToast, HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

interface ASRConfig {
  id: string;
  name: string;
  engine: string;
  model_size: string;
  language: string;
}

export default function SettingsASRPage() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<ASRConfig[]>([]);
  const [name, setName] = useState('');
  const [engine, setEngine] = useState('faster_whisper');
  const [modelSize, setModelSize] = useState('base');
  const [language, setLanguage] = useState('ko');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => client.get('/asr-configs').then((r) => setConfigs(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post('/asr-configs', {
        name, engine, model_size: modelSize, language,
        ...(engine === 'openai_whisper' && apiKey ? { api_key: apiKey } : {}),
      });
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
    await client.delete(`/asr-configs/${id}`);
    load();
  };

  return (
    <Container maxW="4xl" py={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">{t('settings.asrTitle')}</Heading>
        <HStack>
          <Button size="sm" variant="outline" onClick={() => navigate('/settings/llm')}>LLM</Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/settings/tts')}>TTS</Button>
          <Button size="sm" onClick={() => navigate('/dashboard')}>{t('common.dashboard')}</Button>
        </HStack>
      </HStack>

      <Box as="form" onSubmit={handleCreate} mb={8} p={4} borderWidth={1} borderRadius="lg">
        <VStack spacing={3}>
          <FormControl isRequired>
            <FormLabel>{t('settings.configName')}</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My ASR Config" />
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.engine')}</FormLabel>
            <Select value={engine} onChange={(e) => setEngine(e.target.value)}>
              <option value="faster_whisper">Faster Whisper (Local GPU)</option>
              <option value="openai_whisper">OpenAI Whisper (Cloud)</option>
              <option value="web_speech">Web Speech API (Browser)</option>
              <option value="stub">Stub</option>
            </Select>
          </FormControl>
          {engine === 'openai_whisper' && (
            <FormControl>
              <FormLabel>API Key</FormLabel>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
            </FormControl>
          )}
          <FormControl>
            <FormLabel>{t('settings.modelSize')}</FormLabel>
            <Select value={modelSize} onChange={(e) => setModelSize(e.target.value)}>
              <option value="tiny">Tiny</option>
              <option value="base">Base</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.language')}</FormLabel>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="ko">Korean</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
            </Select>
          </FormControl>
          <Button type="submit" colorScheme="blue" w="100%" isLoading={loading}>{t('settings.addConfig')}</Button>
        </VStack>
      </Box>

      <Table size="sm">
        <Thead><Tr><Th>{t('settings.configName')}</Th><Th>{t('settings.engine')}</Th><Th>{t('settings.model')}</Th><Th>{t('settings.language')}</Th><Th></Th></Tr></Thead>
        <Tbody>
          {configs.map((c) => (
            <Tr key={c.id}>
              <Td>{c.name}</Td><Td>{c.engine}</Td><Td>{c.model_size}</Td><Td>{c.language}</Td>
              <Td><Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(c.id)}>{t('common.delete')}</Button></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Container>
  );
}
