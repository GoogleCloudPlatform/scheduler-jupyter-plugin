/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PageConfig } from '@jupyterlab/coreutils';
import {
  ENABLE_API_DOC_URL,
  KMS_DOC_URL,
  LOGS_DOC_URL,
  getConsoleOrigin,
  getKmsUrl,
  getLogsUrl,
  getServiceDisabled
} from '../utils/ConsoleLinks';

const US_CONSOLE = 'https://console.us.cloud.google.com';

function setConsoleOrigin(value: string) {
  jest
    .spyOn(PageConfig, 'getOption')
    .mockImplementation(key => (key === 'consoleOrigin' ? value : ''));
}

// Real response from a Google API that is disabled in the project.
const serviceDisabledError = () => ({
  code: 403,
  status: 'PERMISSION_DENIED',
  message:
    'Cloud Translation API has not been used in project 1007353032215 before or it is disabled. ' +
    'Enable it by visiting https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=1007353032215 then retry. ' +
    'If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.',
  details: [
    {
      '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
      reason: 'SERVICE_DISABLED',
      domain: 'googleapis.com',
      metadata: {
        activationUrl:
          'https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=1007353032215',
        serviceTitle: 'Cloud Translation API',
        service: 'translate.googleapis.com',
        containerInfo: '1007353032215',
        consumer: 'projects/1007353032215'
      }
    },
    {
      '@type': 'type.googleapis.com/google.rpc.Help',
      links: [
        {
          description: 'Google developers console API activation',
          url: 'https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=1007353032215'
        }
      ]
    }
  ]
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getConsoleOrigin', () => {
  it.each([
    'https://console.cloud.google.com',
    'https://console.us.cloud.google.com',
    'https://console.eu.cloud.google.com'
  ])('accepts %s', origin => {
    setConsoleOrigin(origin);
    expect(getConsoleOrigin()).toBe(origin);
  });

  it.each([
    '',
    'https://console.us-central1.cloud.google.com',
    'https://console.cloud.google.com/',
    'http://console.cloud.google.com',
    'https://console.cloud.google.com.evil.com',
    'https://console.developers.google.com'
  ])('rejects %j', origin => {
    setConsoleOrigin(origin);
    expect(getConsoleOrigin()).toBeNull();
  });
});

describe('getLogsUrl', () => {
  it('builds the Logs Explorer query on the Console origin', () => {
    setConsoleOrigin(US_CONSOLE);
    expect(getLogsUrl('my-project', 'run-1', '2026-11-20T18:00:00Z')).toBe(
      `${US_CONSOLE}/logs/query?query=SEARCH%28%22run-1%22%29&cursorTimestamp=2026-11-20T18%3A00%3A00Z&project=my-project`
    );
  });

  it('links to the docs without a Console origin', () => {
    setConsoleOrigin('');
    expect(getLogsUrl('my-project', 'run-1')).toBe(LOGS_DOC_URL);
  });
});

describe('getKmsUrl', () => {
  it('builds the key ring page on the Console origin', () => {
    setConsoleOrigin(US_CONSOLE);
    expect(getKmsUrl('my-project')).toBe(
      `${US_CONSOLE}/security/kms/keyrings?project=my-project`
    );
  });

  it('links to the docs without a Console origin', () => {
    setConsoleOrigin('');
    expect(getKmsUrl('my-project')).toBe(KMS_DOC_URL);
  });
});

describe('getServiceDisabled', () => {
  it('builds the enable link on the Console origin from ErrorInfo', () => {
    setConsoleOrigin(US_CONSOLE);
    expect(getServiceDisabled(serviceDisabledError())).toEqual({
      message: 'Cloud Translation API is disabled in project 1007353032215.',
      url: `${US_CONSOLE}/apis/api/translate.googleapis.com/overview?project=1007353032215`
    });
  });

  it('links to the docs without a Console origin', () => {
    setConsoleOrigin('');
    expect(getServiceDisabled(serviceDisabledError())?.url).toBe(
      ENABLE_API_DOC_URL
    );
  });

  it('never returns the URL from the error message', () => {
    setConsoleOrigin('');
    const result = getServiceDisabled(serviceDisabledError());
    expect(result?.url).not.toContain('console.developers.google.com');
    expect(result?.message).not.toContain('https://');
  });

  it('links to the docs when service is malformed', () => {
    setConsoleOrigin(US_CONSOLE);
    const error = serviceDisabledError();
    error.details[0].metadata!.service = 'evil.com/x';
    expect(getServiceDisabled(error)?.url).toBe(ENABLE_API_DOC_URL);
  });

  it('accepts a project ID as consumer (real Composer response)', () => {
    setConsoleOrigin(US_CONSOLE);
    const error = serviceDisabledError();
    Object.assign(error.details[0].metadata!, {
      serviceTitle: 'Cloud Composer API',
      service: 'composer.googleapis.com',
      consumer: 'projects/durczokj-1-237346',
      containerInfo: 'durczokj-1-237346'
    });
    expect(getServiceDisabled(error)).toEqual({
      message: 'Cloud Composer API is disabled in project durczokj-1-237346.',
      url: `${US_CONSOLE}/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346`
    });
  });

  it('accepts a domain-scoped project ID and encodes it', () => {
    setConsoleOrigin(US_CONSOLE);
    const error = serviceDisabledError();
    error.details[0].metadata!.consumer = 'projects/example.com:my-project';
    expect(getServiceDisabled(error)?.url).toBe(
      `${US_CONSOLE}/apis/api/translate.googleapis.com/overview?project=example.com%3Amy-project`
    );
  });

  it.each(['projects/', 'projects/My-Project', 'projects/a/b', 'folders/123'])(
    'links to the docs for consumer %j',
    consumer => {
      setConsoleOrigin(US_CONSOLE);
      const error = serviceDisabledError();
      error.details[0].metadata!.consumer = consumer;
      expect(getServiceDisabled(error)?.url).toBe(ENABLE_API_DOC_URL);
    }
  );

  it('links to the docs when consumer is missing', () => {
    setConsoleOrigin(US_CONSOLE);
    const error = serviceDisabledError();
    delete (error.details[0].metadata as any).consumer;
    expect(getServiceDisabled(error)?.url).toBe(ENABLE_API_DOC_URL);
  });

  it('falls back to the first sentence of the message without serviceTitle', () => {
    setConsoleOrigin(US_CONSOLE);
    const error = serviceDisabledError();
    delete (error.details[0].metadata as any).serviceTitle;
    expect(getServiceDisabled(error)?.message).toBe(
      'Cloud Translation API has not been used in project 1007353032215 before or it is disabled.'
    );
  });

  it('returns null for other 403s, even with a Console URL in the message', () => {
    setConsoleOrigin(US_CONSOLE);
    expect(
      getServiceDisabled({
        code: 403,
        message:
          "Permission 'iam.serviceAccounts.list' denied. See https://console.cloud.google.com/iam-admin/troubleshooter/summary",
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'IAM_PERMISSION_DENIED',
            domain: 'iam.googleapis.com'
          }
        ]
      })
    ).toBeNull();
  });

  it('returns null without details', () => {
    expect(getServiceDisabled({ code: 403, message: 'Forbidden' })).toBeNull();
  });
});
