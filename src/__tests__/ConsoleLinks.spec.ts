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
  getEnableApiUrl,
  getKmsUrl,
  getLogsUrl
} from '../utils/ConsoleLinks';

const US_CONSOLE = 'https://console.us.cloud.google.com';

function setConsoleOrigin(value: string) {
  jest
    .spyOn(PageConfig, 'getOption')
    .mockImplementation(key => (key === 'consoleOrigin' ? value : ''));
}

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

describe('getEnableApiUrl', () => {
  it('builds the API page on the Console origin', () => {
    setConsoleOrigin(US_CONSOLE);
    expect(getEnableApiUrl('composer.googleapis.com', 'my-project')).toBe(
      `${US_CONSOLE}/apis/api/composer.googleapis.com/overview?project=my-project`
    );
  });

  it('encodes a domain-scoped project ID', () => {
    setConsoleOrigin(US_CONSOLE);
    expect(
      getEnableApiUrl('composer.googleapis.com', 'example.com:my-project')
    ).toBe(
      `${US_CONSOLE}/apis/api/composer.googleapis.com/overview?project=example.com%3Amy-project`
    );
  });

  it('links to the docs without a Console origin', () => {
    setConsoleOrigin('');
    expect(getEnableApiUrl('composer.googleapis.com', 'my-project')).toBe(
      ENABLE_API_DOC_URL
    );
  });
});
