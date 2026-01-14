'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { getWebhookLogs, getWebhookLog } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import type { WebhookLog } from '@/types';
import { ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';

export default function LogsPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [mnemonicFilter, setMnemonicFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const limit = 20;

  const { data: logs, isLoading } = useQuery({
    queryKey: ['webhookLogs', page, statusFilter, mnemonicFilter],
    queryFn: () =>
      getWebhookLogs({
        limit,
        offset: page * limit,
        status: statusFilter || undefined,
        mnemonic: mnemonicFilter || undefined,
      }),
  });

  const { data: logDetail } = useQuery({
    queryKey: ['webhookLog', selectedLog?.id],
    queryFn: () => (selectedLog ? getWebhookLog(selectedLog.id) : null),
    enabled: !!selectedLog,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
      completed: 'success',
      failed: 'danger',
      processing: 'warning',
      ignored: 'default',
      received: 'info',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Webhook Logs</h1>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'failed', label: 'Failed' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'ignored', label: 'Ignored' },
                    { value: 'received', label: 'Received' },
                  ]}
                />
              </div>
              <div className="w-48">
                <Input
                  label="Mnemonic"
                  placeholder="e.g., DUP_SRC_IP"
                  value={mnemonicFilter}
                  onChange={(e) => { setMnemonicFilter(e.target.value); setPage(0); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : logs?.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No logs found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mnemonic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs?.map((log: WebhookLog) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(log.received_at)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {log.mnemonic || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{log.host || '-'}</td>
                        <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.servicenow_ticket_number || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {log.email_sent ? (
                            <Badge variant="success">Sent</Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.processing_time_ms ? formatDuration(log.processing_time_ms) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => p + 1)}
            disabled={!logs || logs.length < limit}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
              <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10">
                <CardTitle>Log Details - {selectedLog.request_id}</CardTitle>
                <button onClick={() => setSelectedLog(null)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Received At</p>
                    <p className="font-medium">{formatDate(selectedLog.received_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p>{getStatusBadge(selectedLog.status)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Mnemonic</p>
                    <p className="font-medium">{selectedLog.mnemonic || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Host</p>
                    <p className="font-medium">{selectedLog.host || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Source IP</p>
                    <p className="font-medium">{selectedLog.source_ip || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Processing Time</p>
                    <p className="font-medium">
                      {selectedLog.processing_time_ms ? formatDuration(selectedLog.processing_time_ms) : '-'}
                    </p>
                  </div>
                </div>

                {selectedLog.message_text && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Message</p>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                      {selectedLog.message_text}
                    </pre>
                  </div>
                )}

                {selectedLog.llm_response && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      LLM Response ({selectedLog.llm_provider_name})
                      {selectedLog.llm_response_time_ms && (
                        <span className="ml-2 text-gray-400">
                          {formatDuration(selectedLog.llm_response_time_ms)}
                        </span>
                      )}
                    </p>
                    <pre className="bg-blue-50 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.llm_response}
                    </pre>
                  </div>
                )}

                {selectedLog.servicenow_ticket_number && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">ServiceNow Ticket</p>
                    <p className="font-medium text-blue-600">{selectedLog.servicenow_ticket_number}</p>
                  </div>
                )}

                {selectedLog.error_message && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Error</p>
                    <pre className="bg-red-50 text-red-700 p-3 rounded text-sm overflow-x-auto">
                      {selectedLog.error_message}
                    </pre>
                  </div>
                )}

                {logDetail?.request_body && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Request Body</p>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(logDetail.request_body, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
