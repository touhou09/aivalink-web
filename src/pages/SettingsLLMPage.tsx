import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

const DEFAULT_LLM_PROVIDER = 'openrouter';
const DEFAULT_LLM_MODEL_NAME = 'aivalink-default-chat';
const DEFAULT_LLM_TEMPERATURE = 0.7;
const DEFAULT_LLM_MAX_TOKENS = 768;

interface LLMConfig {
  id: string;
  name: string;
  provider: string;
  model_name: string;
}

export default function SettingsLLMPage() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => client.get('/llm-configs').then((r) => setConfigs(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const displayModelName = (modelName: string) => (
    modelName === DEFAULT_LLM_MODEL_NAME ? t('settings.defaultAi') : modelName
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post('/llm-configs', {
        name,
        provider: DEFAULT_LLM_PROVIDER,
        model_name: DEFAULT_LLM_MODEL_NAME,
        api_key: apiKey,
        temperature: DEFAULT_LLM_TEMPERATURE,
        max_tokens: DEFAULT_LLM_MAX_TOKENS,
      });
      toast({ title: t('settings.created'), status: 'success', duration: 2000 });
      setName('');
      setApiKey('');
      load();
    } catch {
      toast({ title: t('settings.error'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await client.delete(`/llm-configs/${id}`);
    load();
  };

  return (
    <Container maxW="4xl" py={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">{t('settings.llmTitle')}</Heading>
        <HStack>
          <Button size="sm" variant="outline" onClick={() => navigate('/settings/tts')}>TTS</Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/settings/asr')}>ASR</Button>
          <Button size="sm" onClick={() => navigate('/dashboard')}>{t('common.dashboard')}</Button>
        </HStack>
      </HStack>

      <Box as="form" onSubmit={handleCreate} mb={8} p={4} borderWidth={1} borderRadius="lg">
        <VStack spacing={4} align="stretch">
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>{t('settings.aiBrain')}</Text>
            <HStack>
              <Badge colorScheme="purple">{t('settings.defaultAi')}</Badge>
              <Text fontSize="sm" color="gray.600">{t('settings.defaultAiDescription')}</Text>
            </HStack>
          </Box>

          <FormControl isRequired>
            <FormLabel>{t('settings.configName')}</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.defaultConfigName')} />
          </FormControl>

          <FormControl>
            <FormLabel>{t('settings.optionalApiKey')}</FormLabel>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-or-..." />
            <FormHelperText>{t('settings.optionalApiKeyHint')}</FormHelperText>
          </FormControl>

          <Button type="submit" colorScheme="blue" w="100%" isLoading={loading}>{t('settings.addConfig')}</Button>
        </VStack>
      </Box>

      <Table size="sm">
        <Thead><Tr><Th>{t('settings.configName')}</Th><Th>{t('settings.aiBrain')}</Th><Th></Th></Tr></Thead>
        <Tbody>
          {configs.map((c) => (
            <Tr key={c.id}>
              <Td>{c.name}</Td>
              <Td>{displayModelName(c.model_name)}</Td>
              <Td><Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(c.id)}>{t('common.delete')}</Button></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Container>
  );
}
