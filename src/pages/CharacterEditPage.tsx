import { useEffect, useState } from 'react';
import {
  Box, Button, Container, FormControl, FormLabel, Heading, HStack, Input, Select, Text, Textarea, VStack, useToast,
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import FileUpload from '../components/FileUpload';

interface ConfigOption {
  id: string;
  name: string;
}

export default function CharacterEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [llmConfigId, setLlmConfigId] = useState('');
  const [ttsConfigId, setTtsConfigId] = useState('');
  const [asrConfigId, setAsrConfigId] = useState('');
  const [live2dModelId, setLive2dModelId] = useState('');
  const [emotionMap, setEmotionMap] = useState<Record<string, string>>({ happy: '', sad: '', angry: '', surprised: '', neutral: '' });
  const [llmConfigs, setLlmConfigs] = useState<ConfigOption[]>([]);
  const [ttsConfigs, setTtsConfigs] = useState<ConfigOption[]>([]);
  const [asrConfigs, setAsrConfigs] = useState<ConfigOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get('/llm-configs').then((r) => setLlmConfigs(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
    client.get('/tts-configs').then((r) => setTtsConfigs(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
    client.get('/asr-configs').then((r) => setAsrConfigs(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
    if (!isNew) {
      client.get(`/characters/${id}`).then((r) => {
        setName(r.data.name);
        setPersonaPrompt(r.data.persona_prompt);
        setLlmConfigId(r.data.llm_config_id || '');
        setTtsConfigId(r.data.tts_config_id || '');
        setAsrConfigId(r.data.asr_config_id || '');
        setLive2dModelId(r.data.live2d_model_id || '');
        setEmotionMap(r.data.emotion_map || { happy: '', sad: '', angry: '', surprised: '', neutral: '' });
      }).catch(() => {});
    }
  }, [id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      name,
      persona_prompt: personaPrompt,
      llm_config_id: llmConfigId || null,
      tts_config_id: ttsConfigId || null,
      asr_config_id: asrConfigId || null,
      live2d_model_id: live2dModelId || null,
      emotion_map: emotionMap,
    };
    try {
      if (isNew) {
        await client.post('/characters', data);
      } else {
        await client.put(`/characters/${id}`, data);
      }
      toast({ title: t('character.savedSuccess'), status: 'success', duration: 2000 });
      navigate('/dashboard');
    } catch {
      toast({ title: t('character.saveError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="lg" py={8}>
      <Heading size="lg" mb={6}>{isNew ? t('character.createTitle') : t('character.editTitle')}</Heading>
      <Box as="form" onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormControl isRequired>
            <FormLabel>{t('character.name')}</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>{t('character.personaPrompt')}</FormLabel>
            <Textarea value={personaPrompt} onChange={(e) => setPersonaPrompt(e.target.value)} rows={6} />
          </FormControl>
          <FormControl>
            <FormLabel>{t('character.llmConfig')}</FormLabel>
            <Select value={llmConfigId} onChange={(e) => setLlmConfigId(e.target.value)} placeholder={t('character.selectConfig')}>
              {llmConfigs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>{t('character.ttsConfig')}</FormLabel>
            <Select value={ttsConfigId} onChange={(e) => setTtsConfigId(e.target.value)} placeholder={t('character.selectConfig')}>
              {ttsConfigs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>{t('character.asrConfig')}</FormLabel>
            <Select value={asrConfigId} onChange={(e) => setAsrConfigId(e.target.value)} placeholder={t('character.selectConfig')}>
              {asrConfigs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>{t('character.live2dModel')}</FormLabel>
            <Input value={live2dModelId} onChange={(e) => setLive2dModelId(e.target.value)} placeholder="https://cdn.example.com/model/model.json" mb={2} />
            <FileUpload
              accept=".json,.moc3,.model3.json"
              onUpload={(fileId) => setLive2dModelId(`/api/files/${fileId}`)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>{t('character.emotionMap')}</FormLabel>
            <VStack spacing={2} align="stretch">
              {['happy', 'sad', 'angry', 'surprised', 'neutral'].map((emotion) => (
                <HStack key={emotion}>
                  <Text w="100px" fontSize="sm">{emotion}</Text>
                  <Input
                    size="sm"
                    value={emotionMap[emotion] || ''}
                    onChange={(e) => setEmotionMap({ ...emotionMap, [emotion]: e.target.value })}
                    placeholder={`Motion name for ${emotion}`}
                  />
                </HStack>
              ))}
            </VStack>
          </FormControl>
          <Button type="submit" colorScheme="blue" w="100%" isLoading={loading}>
            {isNew ? t('character.create') : t('common.save')}
          </Button>
          <Button variant="outline" w="100%" onClick={() => navigate('/dashboard')}>
            {t('common.cancel')}
          </Button>
        </VStack>
      </Box>
    </Container>
  );
}
