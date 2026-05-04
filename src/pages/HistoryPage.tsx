import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Container, Heading, VStack, Text, Badge, HStack,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

interface Message {
  id: string;
  role: string;
  content: string;
  emotion: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const loadMessages = useCallback(async (currentOffset: number) => {
    try {
      const res = await client.get(`/conversations/${characterId}?limit=${limit}&offset=${currentOffset}`);
      const data = res.data;
      if (currentOffset === 0) {
        setMessages(data);
      } else {
        setMessages((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === limit);
    } catch {
      // handle error
    }
  }, [characterId]);

  useEffect(() => { loadMessages(0); }, [loadMessages]);

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    loadMessages(newOffset);
  };

  return (
    <Container maxW="3xl" py={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">{t('history.title')}</Heading>
        <Button size="sm" onClick={() => navigate('/dashboard')}>{t('common.back')}</Button>
      </HStack>

      {messages.length === 0 ? (
        <Box p={8} textAlign="center">
          <Text color="gray.500">{t('history.noMessages')}</Text>
        </Box>
      ) : (
        <VStack spacing={3} align="stretch">
          {messages.map((msg) => (
            <Box key={msg.id} p={3} borderWidth={1} borderRadius="md">
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Badge colorScheme={msg.role === 'user' ? 'blue' : 'green'}>{msg.role}</Badge>
                  {msg.emotion && <Badge colorScheme="purple">{msg.emotion}</Badge>}
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  {new Date(msg.created_at).toLocaleString()}
                </Text>
              </HStack>
              <Text fontSize="sm">{msg.content}</Text>
            </Box>
          ))}
          {hasMore && (
            <Button onClick={handleLoadMore} variant="outline" size="sm" alignSelf="center">
              {t('history.loadMore')}
            </Button>
          )}
        </VStack>
      )}
    </Container>
  );
}
