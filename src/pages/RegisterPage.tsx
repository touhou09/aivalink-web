import { useState } from 'react';
import {
  Box, Button, Container, FormControl, FormLabel, Heading, Input, VStack, Text, Link as ChakraLink,
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate('/dashboard');
    } catch {
      setError(t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="sm" py={20}>
      <VStack spacing={6}>
        <Heading size="lg">{t('auth.signUp')}</Heading>
        <Box as="form" onSubmit={handleSubmit} w="100%">
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>{t('auth.displayName')}</FormLabel>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </FormControl>
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
              {t('auth.register')}
            </Button>
          </VStack>
        </Box>
        <Text>
          {t('auth.hasAccount')}{' '}
          <ChakraLink as={Link} to="/login" color="blue.500">
            {t('auth.signIn')}
          </ChakraLink>
        </Text>
      </VStack>
    </Container>
  );
}
