import { useEffect, useState, useCallback } from 'react';
import { Button, Modal, Form, Input, TreeSelect, Tree, message, Card, Empty, Dropdown, Alert } from 'antd';
import { PlusOutlined, MoreOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getCategories, getCategoryTree, createCategory, updateCategory, deleteCategory } from '@/api/categories';
import type { CategoryResponse } from '@/types/category';
import { useBankStore } from '@/stores/bankStore';

function buildTreeSelectData(list: CategoryResponse[]): any[] {
  return list.map((c) => ({
    value: c.id,
    title: c.name,
    children: c.children ? buildTreeSelectData(c.children) : undefined,
  }));
}

function filterSelfAndDescendants(list: CategoryResponse[], excludeId: string): CategoryResponse[] {
  return list
    .filter((c) => c.id !== excludeId)
    .map((c) => ({
      ...c,
      children: c.children ? filterSelfAndDescendants(c.children, excludeId) : undefined,
    }));
}

function buildTreeData(
  data: CategoryResponse[],
  onAddChild: (parentId: string) => void,
  onEdit: (node: CategoryResponse) => void,
  onDelete: (id: string) => void,
  t: (key: string) => string,
  canEdit: boolean,
  canDelete: boolean,
): any[] {
  return data.map((node) => ({
    title: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span>{node.name}</span>
        {(canEdit || canDelete) && (
          <Dropdown
            menu={{
              items: [
                ...(canEdit ? [{ key: 'add', label: t('categories_page.addChild'), onClick: () => onAddChild(node.id) }] : []),
                ...(canEdit ? [{ key: 'edit', label: t('common.edit'), onClick: () => onEdit(node) }] : []),
                ...(canDelete ? [{
                  key: 'delete',
                  label: t('common.delete'),
                  danger: true,
                  onClick: () => {
                    Modal.confirm({
                      title: t('categories_page.deleteCategory'),
                      onOk: () => onDelete(node.id),
                    });
                  },
                }] : []),
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </span>
    ),
    key: node.id,
    children: node.children
      ? buildTreeData(node.children, onAddChild, onEdit, onDelete, t, canEdit, canDelete)
      : undefined,
  }));
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [tree, setTree] = useState<CategoryResponse[]>([]);
  const [flatList, setFlatList] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [form] = Form.useForm();

  const currentBank = useBankStore((s) => s.currentBank);
  const permission = currentBank?.permission;
  const canEdit = permission === 'owner' || permission === 'editor';
  const canDelete = permission === 'owner';

  const fetchData = useCallback(async () => {
    if (!currentBank) return;
    setLoading(true);
    try {
      const [treeRes, flatRes] = await Promise.all([
        getCategoryTree(currentBank.id),
        getCategories(currentBank.id),
      ]);
      setTree(treeRes.data);
      setFlatList(flatRes.data);
    } finally {
      setLoading(false);
    }
  }, [currentBank]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = (parentId?: string) => {
    setEditing(null);
    form.resetFields();
    if (parentId) form.setFieldsValue({ parentId });
    setModalOpen(true);
  };

  const openEdit = (node: CategoryResponse) => {
    setEditing(node);
    form.setFieldsValue({ name: node.name, parentId: node.parentId ?? undefined });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateCategory(editing.id, values);
      message.success(t('categories_page.categoryUpdated'));
    } else {
      await createCategory({ ...values, bankId: currentBank!.id });
      message.success(t('categories_page.categoryCreated'));
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    message.success(t('categories_page.categoryDeleted'));
    fetchData();
  };

  if (!currentBank) {
    return <Alert type="info" message={t('questionBanks_page.noBankSelected')} showIcon />;
  }

  const treeData = buildTreeData(tree, openCreate, openEdit, handleDelete, t, canEdit, canDelete);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>{t('categories_page.title')}</h2>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
            {t('categories_page.createCategory')}
          </Button>
        )}
      </div>

      <Card loading={loading}>
        {tree.length > 0 ? (
          <Tree treeData={treeData} defaultExpandAll />
        ) : (
          <Empty description={t('categories_page.noCategories')} />
        )}
      </Card>

      <Modal
        title={editing ? t('categories_page.editCategory') : t('categories_page.createCategory')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true, message: t('categories_page.nameRequired') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parentId" label={t('categories_page.parentCategory')}>
            <TreeSelect
              placeholder={t('categories_page.noneRoot')}
              allowClear
              treeData={buildTreeSelectData(editing ? filterSelfAndDescendants(flatList, editing.id) : flatList)}
              treeDefaultExpandAll
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
