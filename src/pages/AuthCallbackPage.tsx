import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Spinner, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const completeOAuthCallback = useAuthStore((s) => s.completeOAuthCallback);

  useEffect(() => {
    let active = true;
    completeOAuthCallback()
      .then(() => {
        if (active) navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        if (active) navigate('/login', { replace: true });
      });
    return () => {
      active = false;
    };
  }, [completeOAuthCallback, navigate]);

  return (
    <Container maxW="sm" py={20}>
      <VStack spacing={4}>
        <Spinner size="xl" />
        <Text>{t('auth.completingSignIn')}</Text>
      </VStack>
    </Container>
  );
}
