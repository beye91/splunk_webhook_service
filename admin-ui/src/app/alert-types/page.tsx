'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import {
  getAlertTypes,
  createAlertType,
  updateAlertType,
  deleteAlertType,
  toggleAlertType,
  getLLMProviders,
} from '@/lib/api';
import type { AlertType, LLMProvider } from '@/types';
import { Plus, Edit2, Trash2, Power, X, Bell } from 'lucide-react';
import NotificationManager from '@/components/alerts/NotificationManager';

export default function AlertTypesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<AlertType | null>(null);
  const [managingNotifications, setManagingNotifications] = useState<AlertType | null>(null);

  const { data: alertTypes, isLoading } = useQuery({
    queryKey: ['alertTypes'],
    queryFn: getAlertTypes,
  });

  const { data: llmProviders } = useQuery({
    queryKey: ['llmProviders'],
    queryFn: getLLMProviders,
  });

  const createMutation = useMutation({
    mutationFn: createAlertType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertTypes'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateAlertType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertTypes'] });
      setEditingType(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlertType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertTypes'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleAlertType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertTypes'] });
    },
  });

  const [formData, setFormData] = useState({
    mnemonic: '',
    display_name: '',
    description: '',
    enabled: true,
    use_llm: true,
    llm_provider_id: '',
    llm_prompt: 'You are helpful networking engineer. You will get an error message and need to provide brief a solution with troubleshooting steps for the engineer.',
    create_servicenow_ticket: true,
    send_email: false,
    severity: 'medium',
    urgency: '2',
  });

  const resetForm = () => {
    setFormData({
      mnemonic: '',
      display_name: '',
      description: '',
      enabled: true,
      use_llm: true,
      llm_provider_id: '',
      llm_prompt: 'You are helpful networking engineer. You will get an error message and need to provide brief a solution with troubleshooting steps for the engineer.',
      create_servicenow_ticket: true,
      send_email: false,
      severity: 'medium',
      urgency: '2',
    });
  };

  const handleEdit = (alertType: AlertType) => {
    setEditingType(alertType);
    setFormData({
      mnemonic: alertType.mnemonic,
      display_name: alertType.display_name,
      description: alertType.description || '',
      enabled: alertType.enabled,
      use_llm: alertType.use_llm,
      llm_provider_id: alertType.llm_provider_id?.toString() || '',
      llm_prompt: alertType.llm_prompt,
      create_servicenow_ticket: alertType.create_servicenow_ticket,
      send_email: alertType.send_email,
      severity: alertType.severity,
      urgency: alertType.urgency,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      mnemonic: formData.mnemonic,
      display_name: formData.display_name,
      description: formData.description || null,
      enabled: formData.enabled,
      use_llm: formData.use_llm,
      llm_provider_id: formData.llm_provider_id ? parseInt(formData.llm_provider_id) : null,
      llm_prompt: formData.llm_prompt,
      create_servicenow_ticket: formData.create_servicenow_ticket,
      send_email: formData.send_email,
      severity: formData.severity,
      urgency: formData.urgency,
    };

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      low: 'success',
      medium: 'warning',
      high: 'danger',
      critical: 'danger',
    };
    return <Badge variant={variants[severity] || 'default'}>{severity}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Alert Types</h1>
          <Button onClick={() => { setShowForm(true); setEditingType(null); resetForm(); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Alert Type
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingType ? 'Edit Alert Type' : 'Add New Alert Type'}</CardTitle>
              <button onClick={() => { setShowForm(false); setEditingType(null); resetForm(); }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mnemonic (Error Code)"
                    value={formData.mnemonic}
                    onChange={(e) => setFormData({ ...formData, mnemonic: e.target.value.toUpperCase() })}
                    placeholder="e.g., DUP_SRC_IP"
                    required
                  />
                  <Input
                    label="Display Name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="LLM Provider"
                    value={formData.llm_provider_id}
                    onChange={(e) => setFormData({ ...formData, llm_provider_id: e.target.value })}
                    options={[
                      { value: '', label: 'Use Default' },
                      ...(llmProviders?.map((p: LLMProvider) => ({ value: p.id, label: p.name })) || []),
                    ]}
                  />
                  <Select
                    label="Severity"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'critical', label: 'Critical' },
                    ]}
                  />
                  <Select
                    label="Urgency"
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    options={[
                      { value: '1', label: '1 - High' },
                      { value: '2', label: '2 - Medium' },
                      { value: '3', label: '3 - Low' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LLM Prompt</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                    rows={4}
                    value={formData.llm_prompt}
                    onChange={(e) => setFormData({ ...formData, llm_prompt: e.target.value })}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This prompt will be sent to the LLM along with the error information.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
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
                      checked={formData.use_llm}
                      onChange={(e) => setFormData({ ...formData, use_llm: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Use LLM</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.create_servicenow_ticket}
                      onChange={(e) => setFormData({ ...formData, create_servicenow_ticket: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Create ServiceNow Ticket</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.send_email}
                      onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Send Email</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingType(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                    {editingType ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Alert Types List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">Loading...</CardContent>
            </Card>
          ) : alertTypes?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">No alert types configured</CardContent>
            </Card>
          ) : (
            alertTypes?.map((alertType: AlertType) => (
              <Card key={alertType.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold font-mono">{alertType.mnemonic}</h3>
                        <Badge variant={alertType.enabled ? 'success' : 'default'}>
                          {alertType.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {getSeverityBadge(alertType.severity)}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alertType.display_name}</p>
                      {alertType.description && (
                        <p className="text-sm text-gray-500 mb-2">{alertType.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {alertType.use_llm && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            LLM: {alertType.llm_provider_name || 'Default'}
                          </span>
                        )}
                        {alertType.create_servicenow_ticket && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">ServiceNow</span>
                        )}
                        {alertType.send_email && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Email</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate(alertType.id)}
                      >
                        <Power className={`w-4 h-4 ${alertType.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManagingNotifications(alertType)}
                        title="Manage Notifications"
                      >
                        <Bell className="w-4 h-4 text-purple-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(alertType)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this alert type?')) {
                            deleteMutation.mutate(alertType.id);
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

        {/* Notification Manager Modal */}
        {managingNotifications && (
          <NotificationManager
            alertTypeId={managingNotifications.id}
            alertTypeMnemonic={managingNotifications.mnemonic}
            onClose={() => setManagingNotifications(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
