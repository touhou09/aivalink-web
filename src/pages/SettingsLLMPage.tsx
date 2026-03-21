import { useEffect, useState } from 'react';
import {
  Box, Button, Container, FormControl, FormLabel, Heading, Input, Select, VStack, Table, Thead, Tbody, Tr, Th, Td, useToast, HStack,
  Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

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
  const [provider, setProvider] = useState('openai');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => client.get('/llm-configs').then((r) => setConfigs(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post('/llm-configs', { name, provider, model_name: modelName, api_key: apiKey, temperature, max_tokens: maxTokens });
      toast({ title: t('settings.created'), status: 'success', duration: 2000 });
      setName(''); setApiKey('');
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
        <VStack spacing={3}>
          <FormControl isRequired>
            <FormLabel>{t('settings.configName')}</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My GPT Config" />
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.provider')}</FormLabel>
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="stub">Stub (Echo)</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.model')}</FormLabel>
            <Input value={modelName} onChange={(e) => setModelName(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.apiKey')}</FormLabel>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.temperature')} ({temperature})</FormLabel>
            <Slider value={temperature} min={0} max={2} step={0.1} onChange={setTemperature}>
              <SliderTrack><SliderFilledTrack /></SliderTrack>
              <SliderThumb />
            </Slider>
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.maxTokens')}</FormLabel>
            <NumberInput value={maxTokens} min={100} max={8000} onChange={(_, val) => setMaxTokens(val)}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          <Button type="submit" colorScheme="blue" w="100%" isLoading={loading}>{t('settings.addConfig')}</Button>
        </VStack>
      </Box>

      <Table size="sm">
        <Thead><Tr><Th>{t('settings.configName')}</Th><Th>{t('settings.provider')}</Th><Th>{t('settings.model')}</Th><Th></Th></Tr></Thead>
        <Tbody>
          {configs.map((c) => (
            <Tr key={c.id}>
              <Td>{c.name}</Td><Td>{c.provider}</Td><Td>{c.model_name}</Td>
              <Td><Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(c.id)}>{t('common.delete')}</Button></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Container>
  );
}
