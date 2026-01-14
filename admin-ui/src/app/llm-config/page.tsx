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
  getLLMProviders,
  createLLMProvider,
  updateLLMProvider,
  deleteLLMProvider,
  testLLMProvider,
} from '@/lib/api';
import type { LLMProvider } from '@/types';
import { Plus, Edit2, Trash2, Play, X } from 'lucide-react';

export default function LLMConfigPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ['llmProviders'],
    queryFn: getLLMProviders,
  });

  const createMutation = useMutation({
    mutationFn: createLLMProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llmProviders'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateLLMProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llmProviders'] });
      setEditingProvider(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLLMProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llmProviders'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: testLLMProvider,
    onSuccess: (data, id) => {
      setTestResult({ id, ...data });
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    provider_type: 'openai',
    api_key: '',
    openai_model: 'gpt-4o-mini-2024-07-18',
    ollama_host: 'localhost',
    ollama_port: '11434',
    ollama_model: 'llama3.1',
    max_tokens: '1000',
    temperature: '0.7',
    enabled: true,
    is_default: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      provider_type: 'openai',
      api_key: '',
      openai_model: 'gpt-4o-mini-2024-07-18',
      ollama_host: 'localhost',
      ollama_port: '11434',
      ollama_model: 'llama3.1',
      max_tokens: '1000',
      temperature: '0.7',
      enabled: true,
      is_default: false,
    });
  };

  const handleEdit = (provider: LLMProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      provider_type: provider.provider_type,
      api_key: '',
      openai_model: provider.openai_model || 'gpt-4o-mini-2024-07-18',
      ollama_host: provider.ollama_host || 'localhost',
      ollama_port: String(provider.ollama_port || 11434),
      ollama_model: provider.ollama_model || 'llama3.1',
      max_tokens: String(provider.max_tokens),
      temperature: provider.temperature,
      enabled: provider.enabled,
      is_default: provider.is_default,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      provider_type: formData.provider_type,
      api_key: formData.api_key || undefined,
      openai_model: formData.openai_model,
      ollama_host: formData.ollama_host,
      ollama_port: parseInt(formData.ollama_port),
      ollama_model: formData.ollama_model,
      max_tokens: parseInt(formData.max_tokens),
      temperature: formData.temperature,
      enabled: formData.enabled,
      is_default: formData.is_default,
    };

    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">LLM Providers</h1>
          <Button onClick={() => { setShowForm(true); setEditingProvider(null); resetForm(); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingProvider ? 'Edit Provider' : 'Add New Provider'}</CardTitle>
              <button onClick={() => { setShowForm(false); setEditingProvider(null); resetForm(); }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Select
                    label="Provider Type"
                    value={formData.provider_type}
                    onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
                    options={[
                      { value: 'openai', label: 'OpenAI' },
                      { value: 'ollama', label: 'Ollama (Local)' },
                    ]}
                  />
                </div>

                {formData.provider_type === 'openai' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="API Key"
                      type="password"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder={editingProvider?.has_api_key ? '(unchanged)' : 'sk-...'}
                    />
                    <Input
                      label="Model"
                      value={formData.openai_model}
                      onChange={(e) => setFormData({ ...formData, openai_model: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Ollama Host"
                      value={formData.ollama_host}
                      onChange={(e) => setFormData({ ...formData, ollama_host: e.target.value })}
                    />
                    <Input
                      label="Port"
                      type="number"
                      value={formData.ollama_port}
                      onChange={(e) => setFormData({ ...formData, ollama_port: e.target.value })}
                    />
                    <Input
                      label="Model"
                      value={formData.ollama_model}
                      onChange={(e) => setFormData({ ...formData, ollama_model: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Max Tokens"
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: e.target.value })}
                  />
                  <Input
                    label="Temperature"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
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
                    <span className="ml-2 text-sm text-gray-700">Default Provider</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingProvider(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                    {editingProvider ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Providers List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">Loading...</CardContent>
            </Card>
          ) : providers?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">No LLM providers configured</CardContent>
            </Card>
          ) : (
            providers?.map((provider: LLMProvider) => (
              <Card key={provider.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold">{provider.name}</h3>
                        <Badge variant={provider.enabled ? 'success' : 'default'}>
                          {provider.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {provider.is_default && <Badge variant="info">Default</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Type: {provider.provider_type} |{' '}
                        {provider.provider_type === 'openai'
                          ? `Model: ${provider.openai_model}`
                          : `Host: ${provider.ollama_host}:${provider.ollama_port} | Model: ${provider.ollama_model}`}
                      </p>
                      {testResult?.id === provider.id && (
                        <div className={`mt-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                          {testResult.message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testMutation.mutate(provider.id)}
                        loading={testMutation.isPending && testMutation.variables === provider.id}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(provider)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this provider?')) {
                            deleteMutation.mutate(provider.id);
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
