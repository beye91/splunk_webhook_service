'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import {
  getSMTPConfigs,
  createSMTPConfig,
  updateSMTPConfig,
  deleteSMTPConfig,
  testSMTPConfig,
} from '@/lib/api';
import type { SMTPConfig } from '@/types';
import { Plus, Edit2, Trash2, Play, X } from 'lucide-react';

export default function EmailPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SMTPConfig | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const { data: configs, isLoading } = useQuery({
    queryKey: ['smtpConfigs'],
    queryFn: getSMTPConfigs,
  });

  const createMutation = useMutation({
    mutationFn: createSMTPConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtpConfigs'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSMTPConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtpConfigs'] });
      setEditingConfig(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSMTPConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtpConfigs'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => testSMTPConfig(id, testEmail || undefined),
    onSuccess: (data, id) => {
      setTestResult({ id, ...data });
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    smtp_host: '',
    smtp_port: '587',
    use_tls: true,
    use_ssl: false,
    username: '',
    password: '',
    from_address: '',
    from_name: '',
    enabled: true,
    is_default: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      smtp_host: '',
      smtp_port: '587',
      use_tls: true,
      use_ssl: false,
      username: '',
      password: '',
      from_address: '',
      from_name: '',
      enabled: true,
      is_default: false,
    });
  };

  const handleEdit = (config: SMTPConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      smtp_host: config.smtp_host,
      smtp_port: String(config.smtp_port),
      use_tls: config.use_tls,
      use_ssl: config.use_ssl,
      username: '',
      password: '',
      from_address: config.from_address,
      from_name: config.from_name || '',
      enabled: config.enabled,
      is_default: config.is_default,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name: formData.name,
      smtp_host: formData.smtp_host,
      smtp_port: parseInt(formData.smtp_port),
      use_tls: formData.use_tls,
      use_ssl: formData.use_ssl,
      from_address: formData.from_address,
      from_name: formData.from_name || null,
      enabled: formData.enabled,
      is_default: formData.is_default,
    };

    if (formData.username) data.username = formData.username;
    if (formData.password) data.password = formData.password;

    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Email / SMTP Configuration</h1>
          <Button onClick={() => { setShowForm(true); setEditingConfig(null); resetForm(); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add SMTP Server
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingConfig ? 'Edit SMTP Configuration' : 'Add New SMTP Server'}</CardTitle>
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
                    label="SMTP Host"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Port"
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                    required
                  />
                  <div className="flex items-end space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.use_tls}
                        onChange={(e) => setFormData({ ...formData, use_tls: e.target.checked, use_ssl: false })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Use TLS (STARTTLS)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.use_ssl}
                        onChange={(e) => setFormData({ ...formData, use_ssl: e.target.checked, use_tls: false })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Use SSL</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder={editingConfig?.has_credentials ? '(unchanged)' : 'Optional'}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingConfig?.has_credentials ? '(unchanged)' : 'Optional'}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="From Address"
                    type="email"
                    value={formData.from_address}
                    onChange={(e) => setFormData({ ...formData, from_address: e.target.value })}
                    placeholder="alerts@example.com"
                    required
                  />
                  <Input
                    label="From Name"
                    value={formData.from_name}
                    onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                    placeholder="Splunk Alerts"
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

        {/* Test Email Input */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Enter email for test..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-gray-500">Optional: Enter email to receive test message</span>
            </div>
          </CardContent>
        </Card>

        {/* Configs List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">Loading...</CardContent>
            </Card>
          ) : configs?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">No SMTP configurations</CardContent>
            </Card>
          ) : (
            configs?.map((config: SMTPConfig) => (
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
                        {config.smtp_host}:{config.smtp_port} | From: {config.from_address}
                        {config.use_tls && ' | TLS'}
                        {config.use_ssl && ' | SSL'}
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
