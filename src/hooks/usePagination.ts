import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function usePagination(defaultPageSize = 20) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const pagination = useMemo(() => ({ page, pageSize }), [page, pageSize]);

  const onChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  };

  const reset = () => {
    setPage(1);
  };

  const antPagination = {
    current: page,
    pageSize,
    total: 0,
    showTotal: (count: number) => t('common.pageTotal', { count }),
    onChange,
  };

  return { pagination, antPagination, reset };
}
