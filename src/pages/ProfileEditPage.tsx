import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { useAuthStore, type AuthUser } from '../stores/authStore';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeAvatarUrl(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function ProfileEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((state) => state.user);
  const loadUser = useAuthStore((state) => state.loadUser);
  const setUser = useAuthStore((state) => state.setUser);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ displayName: boolean; email: boolean }>({ displayName: false, email: false });

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? '');
      setEmail(user.email ?? '');
      setAvatarUrl(user.avatar_url ?? '');
      return;
    }

    loadUser().catch(() => {
      navigate('/dashboard');
    });
  }, [loadUser, navigate, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setDisplayName(user.display_name ?? '');
    setEmail(user.email ?? '');
    setAvatarUrl(user.avatar_url ?? '');
  }, [user]);

  const trimmedDisplayName = displayName.trim();
  const trimmedEmail = email.trim();
  const displayNameError = trimmedDisplayName ? '' : t('profile.validation.displayName');
  const emailError = EMAIL_PATTERN.test(trimmedEmail) ? '' : t('profile.validation.email');
  const isFormValid = !displayNameError && !emailError;

  const previewUrl = useMemo(() => sanitizeAvatarUrl(avatarUrl), [avatarUrl]);

  const handleSubmit = async (event: React.FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    setTouched({ displayName: true, email: true });

    if (!isFormValid) {
      return;
    }

    setLoading(true);

    try {
      const response = await client.patch<AuthUser>('/users/me', {
        display_name: trimmedDisplayName,
        email: trimmedEmail,
        avatar_url: sanitizeAvatarUrl(avatarUrl),
      });

      setUser(response.data);
      toast({ title: t('profile.saveSuccess'), status: 'success', duration: 2500 });
      navigate('/dashboard');
    } catch {
      toast({ title: t('profile.saveError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="3xl" py={8}>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between" align={{ base: 'start', md: 'center' }} flexDir={{ base: 'column', md: 'row' }}>
          <Box>
            <Heading size="lg" mb={2}>{t('profile.title')}</Heading>
            <Text color="gray.500">{t('profile.subtitle')}</Text>
          </Box>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            {t('profile.backToDashboard')}
          </Button>
        </HStack>

        <Box as="form" noValidate onSubmit={handleSubmit} borderWidth={1} borderRadius="xl" p={{ base: 5, md: 8 }}>
          <VStack spacing={6} align="stretch">
            <HStack spacing={4} align="center">
              <Avatar size="xl" name={trimmedDisplayName || trimmedEmail || 'User'} src={previewUrl || undefined} />
              <VStack align="start" spacing={1}>
                <Text fontWeight="semibold">{t('profile.preview')}</Text>
                <Text fontSize="sm" color="gray.500">{trimmedDisplayName || t('profile.emptyName')}</Text>
                <Text fontSize="sm" color="gray.500">{trimmedEmail || t('profile.emptyEmail')}</Text>
              </VStack>
            </HStack>

            <FormControl isRequired isInvalid={touched.displayName && Boolean(displayNameError)}>
              <FormLabel>{t('profile.displayName')}</FormLabel>
              <Input
                value={displayName}
                onBlur={() => setTouched((prev) => ({ ...prev, displayName: true }))}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t('profile.displayName')}
              />
              <FormErrorMessage>{displayNameError}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={touched.email && Boolean(emailError)}>
              <FormLabel>{t('profile.email')}</FormLabel>
              <Input
                type="email"
                value={email}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="hello@example.com"
              />
              <FormErrorMessage>{emailError}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>{t('profile.avatarUrl')}</FormLabel>
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://example.com/avatar.png"
              />
              <FormHelperText>{t('profile.avatarHint')}</FormHelperText>
            </FormControl>

            <HStack justify="flex-end" spacing={3}>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" colorScheme="blue" isLoading={loading}>
                {t('common.save')}
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}