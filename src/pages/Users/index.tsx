import { useEffect, useState } from 'react';
import { Button, Modal, Form, Input, Select, Table, message, Popconfirm, Tag, List, Space, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { formatDateTime } from '@/utils/format';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { getUsers, createUser, updateUser, deleteUser } from '@/api/users';
import type { UserResponse, CreateUserRequest } from '@/types/user';
import { Role } from '@/types/enums';
import { getRoleLabel } from '@/utils/constants';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import RegistrationInvites from './RegistrationInvites';

const roleOptions = Object.values(Role).map((value) => ({
  value,
  get label() { return getRoleLabel(value as Role); },
}));

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (user: UserResponse) => {
    setEditingUser(user);
    form.setFieldsValue({ username: user.username, role: user.role });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingUser) {
      const updateData: Record<string, string> = {};
      if (values.username) updateData.username = values.username;
      if (values.password) updateData.password = values.password;
      if (values.role) updateData.role = values.role;
      await updateUser(editingUser.id, updateData);
      message.success(t('users.userUpdated'));
    } else {
      await createUser(values as CreateUserRequest);
      message.success(t('users.userCreated'));
    }
    setModalOpen(false);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    await deleteUser(id);
    message.success(t('users.userDeleted'));
    fetchUsers();
  };

  const columns: ColumnsType<UserResponse> = [
    { title: t('common.username'), dataIndex: 'username', key: 'username' },
    {
      title: t('common.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: Role) => <Tag>{getRoleLabel(role)}</Tag>,
    },
    {
      title: t('users.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => openEdit(record)}>
            {t('common.edit')}
          </Button>
          <Popconfirm title={t('users.deleteUser')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2>{t('users.title')}</h2>
        <Space wrap>
          <Button icon={<KeyOutlined />} onClick={() => setInvitesOpen(true)}>{t('users.registrationInvites')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('users.createUser')}
          </Button>
        </Space>
      </div>

      {isMobile ? (
        <List
          loading={loading}
          dataSource={users}
          renderItem={(record) => (
            <List.Item style={{ padding: 0, marginBottom: 8 }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16 }}>{record.username}</strong>
                  <Tag>{getRoleLabel(record.role)}</Tag>
                </div>
                <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                  {t('users.createdAt')}: {formatDateTime(record.createdAt)}
                </div>
                <Space style={{ marginTop: 12 }}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                    {t('common.edit')}
                  </Button>
                  <Popconfirm title={t('users.deleteUser')} onConfirm={() => handleDelete(record.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      {t('common.delete')}
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      )}

      {invitesOpen && <RegistrationInvites onClose={() => setInvitesOpen(false)} />}

      <Modal
        title={editingUser ? t('users.editUser') : t('users.createUser')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label={t('common.username')}
            rules={editingUser ? [] : [{ required: true, min: 6, message: t('common.minChars', { min: 6 }) }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('common.password')}
            rules={editingUser ? [{ min: 6, message: t('common.minChars', { min: 6 }) }] : [{ required: true, min: 6, message: t('common.minChars', { min: 6 }) }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t('common.confirmPassword')}
            dependencies={['password']}
            rules={[
              ...(editingUser ? [] : [{ required: true, message: t('common.required') }]),
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('users.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label={t('common.role')} initialValue={Role.student}>
            <Select options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
