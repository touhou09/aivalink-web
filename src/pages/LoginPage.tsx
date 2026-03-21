import { useState } from 'react';
import {
  Box, Button, Container, FormControl, FormLabel, Heading, Input, VStack, Text, Divider, Link as ChakraLink,
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="sm" py={20}>
      <VStack spacing={6}>
        <Heading size="lg">{t('auth.signIn')}</Heading>
        <Box as="form" onSubmit={handleSubmit} w="100%">
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>{t('auth.email')}</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>{t('auth.password')}</FormLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormControl>
            {error && <Text color="red.500">{error}</Text>}
            <Button type="submit" colorScheme="blue" w="100%" isLoading={loading}>
              {t('auth.signIn')}
            </Button>
          </VStack>
        </Box>
        <Divider />
        <Button
          as="a"
          href={`${API_BASE}/api/auth/google`}
          variant="outline"
          w="100%"
        >
          {t('auth.googleSignIn')}
        </Button>
        <Text>
          {t('auth.noAccount')}{' '}
          <ChakraLink as={Link} to="/register" color="blue.500">
            {t('auth.register')}
          </ChakraLink>
        </Text>
      </VStack>
    </Container>
  );
}
