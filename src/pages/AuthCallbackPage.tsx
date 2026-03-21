import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Spinner, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);

  useEffect(() => {
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [params, navigate, setTokens]);

  return (
    <Container maxW="sm" py={20}>
      <VStack spacing={4}>
        <Spinner size="xl" />
        <Text>{t('auth.completingSignIn')}</Text>
      </VStack>
    </Container>
  );
}
