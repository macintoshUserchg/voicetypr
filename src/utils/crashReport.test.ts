import { describe, expect, it } from 'vitest';
import { buildReportBody, type ManualReportData } from './crashReport';

const baseReport: ManualReportData = {
  message: 'The app failed after recording.',
  appVersion: '1.12.2',
  platform: 'macos',
  osVersion: '15.0',
  architecture: 'aarch64',
  currentModel: 'base.en',
  deviceId: 'device-123',
  timestamp: '2026-04-27T00:00:00.000Z',
  logFileName: 'voicetypr-2026-04-27.log',
  logContent: 'INFO redacted log line',
  logTruncated: false,
  logStatusNote: '',
};

describe('buildReportBody', () => {
  it('omits the contact section when name and email are blank', () => {
    const body = buildReportBody(baseReport);

    expect(body).not.toContain('### Contact');
    expect(body).toContain('### Message');
    expect(body).toContain('The app failed after recording.');
  });

  it('formats environment and latest log sections', () => {
    const body = buildReportBody({
      ...baseReport,
      name: 'Moin',
      email: 'moin@example.com',
      logTruncated: true,
    });

    expect(body).toContain('### Contact');
    expect(body).toContain('Name: Moin');
    expect(body).toContain('Email: moin@example.com');
    expect(body).toContain('| App Version | 1.12.2 |');
    expect(body).toContain('| Platform | macos |');
    expect(body).toContain('_The log was truncated. Only the most recent entries are included._');
    expect(body).toContain('_Source: voicetypr-2026-04-27.log_');
    expect(body).toContain('INFO redacted log line');
  });

  it('uses an omitted-log note when the email body excludes logs', () => {
    const body = buildReportBody(baseReport, {
      includeLog: false,
      omittedLogNote: 'Log omitted from email draft.',
    });

    expect(body).toContain('## Latest App Log');
    expect(body).toContain('> Log omitted from email draft.');
    expect(body).not.toContain('INFO redacted log line');
  });
});
