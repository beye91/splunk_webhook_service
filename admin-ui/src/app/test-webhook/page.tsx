'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { getAlertTypes, testWebhook } from '@/lib/api';
import type { AlertType, WebhookTestResponse } from '@/types';
import { Play, CheckCircle, XCircle, ExternalLink, Clock, Mail, Server } from 'lucide-react';

export default function TestWebhookPage() {
  const router = useRouter();
  const [testResult, setTestResult] = useState<WebhookTestResponse | null>(null);

  const { data: alertTypes, isLoading: loadingAlertTypes } = useQuery({
    queryKey: ['alertTypes'],
    queryFn: getAlertTypes,
  });

  const enabledAlertTypes = alertTypes?.filter((at: AlertType) => at.enabled) || [];

  const [formData, setFormData] = useState({
    mnemonic: '',
    host: '',
    vendor: 'Cisco',
    message_text: '',
  });

  const testMutation = useMutation({
    mutationFn: testWebhook,
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: error.response?.data?.detail || error.message || 'An error occurred',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    testMutation.mutate(formData);
  };

  const handleMnemonicChange = (mnemonic: string) => {
    const alertType = alertTypes?.find((at: AlertType) => at.mnemonic === mnemonic);
    setFormData(prev => ({
      ...prev,
      mnemonic,
      message_text: prev.message_text || (alertType ? `Sample ${alertType.display_name} error message for testing purposes.` : '')
    }));
  };

  const viewLogDetails = () => {
    if (testResult?.details?.log_id) {
      router.push(`/logs?highlight=${testResult.details.log_id}`);
    } else {
      router.push('/logs');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Webhook</h1>
          <p className="text-gray-500 mt-1">
            Send a test webhook to trigger the full processing pipeline including LLM analysis,
            ServiceNow ticket creation, and email notifications.
          </p>
        </div>

        {/* Test Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Alert Type (Mnemonic)"
                  value={formData.mnemonic}
                  onChange={(e) => handleMnemonicChange(e.target.value)}
                  options={[
                    { value: '', label: 'Select an alert type...' },
                    ...enabledAlertTypes.map((at: AlertType) => ({
                      value: at.mnemonic,
                      label: `${at.mnemonic} - ${at.display_name}`,
                    })),
                  ]}
                  required
                />
                <Input
                  label="Host / Device Name"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="e.g., router-01.lab.local"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  options={[
                    { value: 'Cisco', label: 'Cisco' },
                    { value: 'Juniper', label: 'Juniper' },
                    { value: 'Arista', label: 'Arista' },
                    { value: 'Palo Alto', label: 'Palo Alto' },
                    { value: 'Fortinet', label: 'Fortinet' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
                <div>
                  {formData.mnemonic && (
                    <div className="text-sm text-gray-500 mt-6">
                      {alertTypes?.find((at: AlertType) => at.mnemonic === formData.mnemonic)?.description}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Error Message / Syslog Content
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                  rows={4}
                  value={formData.message_text}
                  onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                  placeholder="Paste the syslog message or error text here..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will be sent to the LLM for analysis and included in the ServiceNow ticket.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={testMutation.isPending}
                  disabled={!formData.mnemonic || !formData.host || !formData.message_text}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Send Test Webhook
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Test Result */}
        {testResult && (
          <Card className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                )}
                Test Result
              </CardTitle>
              <Badge variant={testResult.success ? 'success' : 'danger'}>
                {testResult.success ? 'Success' : 'Failed'}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'} mb-4`}>
                {testResult.message}
              </p>

              {testResult.details && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Server className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">ServiceNow Ticket</p>
                        <p className="font-medium">
                          {testResult.details.ticket_created ? (
                            <span className="text-blue-600">{testResult.details.ticket_number}</span>
                          ) : (
                            <span className="text-gray-400">Not created</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium">
                          {testResult.details.email_sent ? (
                            <span className="text-green-600">Sent</span>
                          ) : (
                            <span className="text-gray-400">Not sent</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Processing Time</p>
                        <p className="font-medium">
                          {testResult.details.processing_time_ms
                            ? `${testResult.details.processing_time_ms}ms`
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={viewLogDetails}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Log Details
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">How it works</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Select an enabled alert type from your configured mnemonics</li>
              <li>Enter a test hostname and error message</li>
              <li>The webhook service will process the request through the full pipeline</li>
              <li>LLM will analyze the error and generate recommendations</li>
              <li>ServiceNow ticket will be created (if configured for this alert type)</li>
              <li>Email notifications will be sent (if configured for this alert type)</li>
              <li>Results are logged and viewable in the Logs page</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
