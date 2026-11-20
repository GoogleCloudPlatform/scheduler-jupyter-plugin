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
import { showForbiddenError } from '../utils/ForbiddenError';

const EU_CONSOLE = 'https://console.eu.cloud.google.com';

function makeSetters() {
  return {
    setIsApiError: jest.fn(),
    setApiError: jest.fn(),
    setApiEnableUrl: jest.fn()
  };
}

beforeEach(() => {
  jest
    .spyOn(PageConfig, 'getOption')
    .mockImplementation(key => (key === 'consoleOrigin' ? EU_CONSOLE : ''));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('showForbiddenError', () => {
  it('shows the enable banner for SERVICE_DISABLED', () => {
    const setters = makeSetters();
    showForbiddenError(
      {
        code: 403,
        message:
          'Cloud Composer API has not been used in project durczokj-1-237346 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346 then retry.',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'SERVICE_DISABLED',
            domain: 'googleapis.com',
            metadata: {
              serviceTitle: 'Cloud Composer API',
              service: 'composer.googleapis.com',
              consumer: 'projects/durczokj-1-237346'
            }
          }
        ]
      },
      setters
    );
    expect(setters.setIsApiError).toHaveBeenCalledWith(true);
    expect(setters.setApiError).toHaveBeenCalledWith(
      'Cloud Composer API is disabled in project durczokj-1-237346.'
    );
    expect(setters.setApiEnableUrl).toHaveBeenCalledWith([
      `${EU_CONSOLE}/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346`
    ]);
  });

  it('shows other 403s as text without a banner link', () => {
    const setters = makeSetters();
    const message =
      "Permission 'iam.serviceAccounts.list' denied. See https://console.cloud.google.com/iam-admin/troubleshooter/summary";
    showForbiddenError({ code: 403, message }, setters);
    expect(setters.setIsApiError).not.toHaveBeenCalled();
    expect(setters.setApiEnableUrl).not.toHaveBeenCalled();
    expect(setters.setApiError).toHaveBeenCalledWith(message);
  });
});
