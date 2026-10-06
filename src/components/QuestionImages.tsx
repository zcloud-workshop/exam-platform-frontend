import { useRef, useState } from 'react';
import { Alert, Button, Image } from 'antd';
import { useTranslation } from 'react-i18next';
import type { QuestionImageResponse } from '@/types/question';

interface QuestionImagesProps {
  images: QuestionImageResponse[];
  onRefresh: () => Promise<void>;
}

function QuestionImage({ image, onRefresh }: {
  image: QuestionImageResponse;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const autoRefreshAttempted = useRef(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      setFailed(false);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      style={{ marginTop: 12, maxWidth: '100%' }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {failed ? (
        <Alert
          type="error"
          showIcon
          message={t('questionImages.loadFailed')}
          action={<Button size="small" loading={refreshing} onClick={refresh}>{t('questionImages.retry')}</Button>}
        />
      ) : (
        <Image
          src={image.url}
          alt={image.originalName}
          styles={{ root: { maxWidth: '100%' }, image: { maxWidth: '100%', height: 'auto' } }}
          onError={() => {
            setFailed(true);
            if (!autoRefreshAttempted.current && Date.parse(image.expiresAt) <= Date.now()) {
              autoRefreshAttempted.current = true;
              void refresh();
            }
          }}
        />
      )}
    </div>
  );
}

export default function QuestionImages({ images, onRefresh }: QuestionImagesProps) {
  if (images.length === 0) return null;

  return (
    <div style={{ marginBottom: 16, maxWidth: '100%' }}>
      {images.map((image) => <QuestionImage key={`${image.id}:${image.url}`} image={image} onRefresh={onRefresh} />)}
    </div>
  );
}
