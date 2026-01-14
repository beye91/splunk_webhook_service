'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import {
  getServiceNowConfigs,
  createServiceNowConfig,
  updateServiceNowConfig,
  deleteServiceNowConfig,
  testServiceNowConfig,
} from '@/lib/api';
import type { ServiceNowConfig } from '@/types';
import { Plus, Edit2, Trash2, Play, X } from 'lucide-react';

export default function ServiceNowPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ServiceNowConfig | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['servicenowConfigs'],
    queryFn: getServiceNowConfigs,
  });

  const createMutation = useMutation({
    mutationFn: createServiceNowConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicenowConfigs'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateServiceNowConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicenowConfigs'] });
      setEditingConfig(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteServiceNowConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicenowConfigs'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: testServiceNowConfig,
    onSuccess: (data, id) => {
      setTestResult({ id, ...data });
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    instance_url: '',
    username: '',
    password: '',
    default_caller_id: '',
    default_assignment_group: '',
    default_category: '',
    enabled: true,
    is_default: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      instance_url: '',
      username: '',
      password: '',
      default_caller_id: '',
      default_assignment_group: '',
      default_category: '',
      enabled: true,
      is_default: false,
    });
  };

  const handleEdit = (config: ServiceNowConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      instance_url: config.instance_url,
      username: '',
      password: '',
      default_caller_id: config.default_caller_id || '',
      default_assignment_group: config.default_assignment_group || '',
      default_category: config.default_category || '',
      enabled: config.enabled,
      is_default: config.is_default,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name: formData.name,
      instance_url: formData.instance_url,
      default_caller_id: formData.default_caller_id || null,
      default_assignment_group: formData.default_assignment_group || null,
      default_category: formData.default_category || null,
      enabled: formData.enabled,
      is_default: formData.is_default,
    };

    if (formData.username) data.username = formData.username;
    if (formData.password) data.password = formData.password;

    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      data.username = formData.username;
      data.password = formData.password;
      createMutation.mutate(data);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ServiceNow Configuration</h1>
          <Button onClick={() => { setShowForm(true); setEditingConfig(null); resetForm(); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Configuration
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingConfig ? 'Edit Configuration' : 'Add New Configuration'}</CardTitle>
              <button onClick={() => { setShowForm(false); setEditingConfig(null); resetForm(); }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Configuration Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Instance URL"
                    value={formData.instance_url}
                    onChange={(e) => setFormData({ ...formData, instance_url: e.target.value })}
                    placeholder="example.service-now.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder={editingConfig ? '(unchanged)' : ''}
                    required={!editingConfig}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingConfig ? '(unchanged)' : ''}
                    required={!editingConfig}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Default Caller ID"
                    value={formData.default_caller_id}
                    onChange={(e) => setFormData({ ...formData, default_caller_id: e.target.value })}
                    placeholder="Optional"
                  />
                  <Input
                    label="Default Assignment Group"
                    value={formData.default_assignment_group}
                    onChange={(e) => setFormData({ ...formData, default_assignment_group: e.target.value })}
                    placeholder="Optional"
                  />
                  <Input
                    label="Default Category"
                    value={formData.default_category}
                    onChange={(e) => setFormData({ ...formData, default_category: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enabled</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Default Configuration</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingConfig(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                    {editingConfig ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Configs List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">Loading...</CardContent>
            </Card>
          ) : configs?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">No ServiceNow configurations</CardContent>
            </Card>
          ) : (
            configs?.map((config: ServiceNowConfig) => (
              <Card key={config.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold">{config.name}</h3>
                        <Badge variant={config.enabled ? 'success' : 'default'}>
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {config.is_default && <Badge variant="info">Default</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Instance: {config.instance_url}
                      </p>
                      {testResult?.id === config.id && (
                        <div className={`mt-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                          {testResult.message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testMutation.mutate(config.id)}
                        loading={testMutation.isPending && testMutation.variables === config.id}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this configuration?')) {
                            deleteMutation.mutate(config.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
