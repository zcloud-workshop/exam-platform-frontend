import { useEffect, useState } from 'react';
import { Button, Form, Modal, Popconfirm, Select, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { createRegistrationInvite, deleteRegistrationInvite, getRegistrationInvites } from '@/api/users';
import { Role } from '@/types/enums';
import type { RegistrationInviteResponse } from '@/types/user';
import { getRoleLabel } from '@/utils/constants';
import { formatDateTime } from '@/utils/format';

export default function RegistrationInvites({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>(Role.student);
  const [invites, setInvites] = useState<RegistrationInviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRegistrationInvites()
      .then((res) => { if (active) setInvites(res.data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await createRegistrationInvite(role);
      setInvites((current) => [res.data, ...current]);
      message.success(t('users.inviteCreated'));
    } catch {
      // error handled by interceptor
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteRegistrationInvite(id);
      setInvites((current) => current.filter((invite) => invite.id !== id));
      message.success(t('users.inviteDeleted'));
    } catch {
      // error handled by interceptor
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnsType<RegistrationInviteResponse> = [
    {
      title: t('auth.inviteCode'), dataIndex: 'code',
      render: (code: string, invite) => <Typography.Text copyable={!invite.usedAt} code>{code}</Typography.Text>,
    },
    {
      title: t('common.role'), dataIndex: 'role',
      render: (value: Role) => <Tag>{getRoleLabel(value)}</Tag>,
    },
    {
      title: t('users.inviteStatus'), dataIndex: 'usedAt',
      render: (value: string | null) => <Tag color={value ? 'default' : 'green'}>{t(value ? 'users.inviteUsed' : 'users.inviteUnused')}</Tag>,
    },
    {
      title: t('users.createdAt'), dataIndex: 'createdAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: t('common.actions'), key: 'actions', fixed: 'right',
      render: (_, invite) => (
        <Popconfirm title={t('users.deleteInvite')} description={t('users.deleteInviteDescription')}
          onConfirm={() => handleDelete(invite.id)} disabled={deletingId !== null}
          okText={t('common.delete')} cancelText={t('common.cancel')}>
          <Button type="link" danger loading={deletingId === invite.id} disabled={deletingId !== null}>
            {t('common.delete')}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal title={t('users.registrationInvites')} open onCancel={onClose} footer={null} width={820}>
      <Typography.Paragraph type="secondary">{t('users.inviteDescription')}</Typography.Paragraph>
      <Form layout="vertical">
        <Form.Item label={t('users.inviteRole')}>
          <Select value={role} onChange={setRole} options={Object.values(Role).map((value) => ({ value, label: getRoleLabel(value) }))} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleCreate} loading={creating} disabled={loading}>{t('users.generateInvite')}</Button>
        </Form.Item>
      </Form>
      <Table rowKey="id" columns={columns} dataSource={invites} loading={loading}
        pagination={{ pageSize: 5 }} scroll={{ x: 'max-content' }} />
    </Modal>
  );
}
