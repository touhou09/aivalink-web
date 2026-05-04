import { useCallback, useState } from 'react';
import { Box, Progress, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

interface Props {
  onUpload: (fileId: string, fileName: string) => void;
  accept?: string;
}

export default function FileUpload({ onUpload, accept }: Props) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await client.post('/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      onUpload(res.data.id, res.data.filename);
    } catch {
      // handle error
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) uploadFile(file);
    };
    input.click();
  };

  return (
    <VStack spacing={2} w="100%">
      <Box
        w="100%"
        p={6}
        borderWidth={2}
        borderStyle="dashed"
        borderColor={isDragging ? 'blue.400' : 'gray.300'}
        borderRadius="lg"
        textAlign="center"
        cursor="pointer"
        bg={isDragging ? 'blue.50' : 'transparent'}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <Text color="gray.500" fontSize="sm">
          {t('common.dragDropOrClick')}
        </Text>
      </Box>
      {uploading && <Progress value={progress} w="100%" size="sm" colorScheme="blue" />}
    </VStack>
  );
}
