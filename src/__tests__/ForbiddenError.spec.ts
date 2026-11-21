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
import { ENABLE_API_DOC_URL } from '../utils/ConsoleLinks';
import {
  getEnableApiBanner,
  showForbiddenError
} from '../utils/ForbiddenError';
import {
  composerDisabled,
  iamPermissionDenied,
  translationDisabled
} from './serviceDisabledFixtures';

const EU_CONSOLE = 'https://console.eu.cloud.google.com';

function setConsoleOrigin(value: string) {
  jest
    .spyOn(PageConfig, 'getOption')
    .mockImplementation(key => (key === 'consoleOrigin' ? value : ''));
}

function makeSetters() {
  return {
    setIsApiError: jest.fn(),
    setApiError: jest.fn(),
    setApiEnableUrl: jest.fn()
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getEnableApiBanner', () => {
  it('links the API page on the Console origin', () => {
    setConsoleOrigin(EU_CONSOLE);
    expect(getEnableApiBanner(composerDisabled())).toEqual({
      message: 'Cloud Composer API is disabled in project durczokj-1-237346.',
      url: `${EU_CONSOLE}/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346`
    });
  });

  it('links the docs without a Console origin', () => {
    setConsoleOrigin('');
    expect(getEnableApiBanner(translationDisabled())).toEqual({
      message: 'Cloud Translation API is disabled in project 1007353032215.',
      url: ENABLE_API_DOC_URL
    });
  });

  it('links the docs when the project is unusable', () => {
    setConsoleOrigin(EU_CONSOLE);
    const error = composerDisabled();
    error.details[0].metadata.consumer = 'folders/123';
    expect(getEnableApiBanner(error)).toEqual({
      message: 'Cloud Composer API is disabled.',
      url: ENABLE_API_DOC_URL
    });
  });

  it('uses a fixed message without serviceTitle', () => {
    setConsoleOrigin(EU_CONSOLE);
    const error = composerDisabled();
    delete error.details[0].metadata.serviceTitle;
    expect(getEnableApiBanner(error)?.message).toBe(
      'A required API is disabled.'
    );
  });

  it('returns null for other 403s', () => {
    setConsoleOrigin(EU_CONSOLE);
    expect(getEnableApiBanner(iamPermissionDenied())).toBeNull();
  });
});

describe('showForbiddenError', () => {
  it('shows the enable banner for SERVICE_DISABLED', () => {
    setConsoleOrigin(EU_CONSOLE);
    const setters = makeSetters();
    showForbiddenError(composerDisabled(), setters);
    expect(setters.setIsApiError).toHaveBeenCalledWith(true);
    expect(setters.setApiError).toHaveBeenCalledWith(
      'Cloud Composer API is disabled in project durczokj-1-237346.'
    );
    expect(setters.setApiEnableUrl).toHaveBeenCalledWith([
      `${EU_CONSOLE}/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346`
    ]);
  });

  it('shows other 403s as text without a banner link', () => {
    setConsoleOrigin(EU_CONSOLE);
    const setters = makeSetters();
    const error = iamPermissionDenied();
    showForbiddenError(error, setters);
    expect(setters.setIsApiError).not.toHaveBeenCalled();
    expect(setters.setApiEnableUrl).not.toHaveBeenCalled();
    expect(setters.setApiError).toHaveBeenCalledWith(error.message);
  });
});
