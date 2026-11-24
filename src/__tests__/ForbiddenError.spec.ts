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

const GLOBAL_CONSOLE = 'https://console.cloud.google.com';
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
  it('links the API page on the global Console', () => {
    setConsoleOrigin(GLOBAL_CONSOLE);
    expect(getEnableApiBanner(composerDisabled())).toEqual({
      message: 'Cloud Composer API is disabled in project durczokj-1-237346.',
      url: `${GLOBAL_CONSOLE}/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346`
    });
  });

  it('links the docs on a Jurisdictional Console', () => {
    setConsoleOrigin(EU_CONSOLE);
    expect(getEnableApiBanner(composerDisabled())).toEqual({
      message: 'Cloud Composer API is disabled in project durczokj-1-237346.',
      url: ENABLE_API_DOC_URL
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
    setConsoleOrigin(GLOBAL_CONSOLE);
    const setters = makeSetters();
    showForbiddenError(composerDisabled(), setters);
    expect(setters.setIsApiError).toHaveBeenCalledWith(true);
    expect(setters.setApiError).toHaveBeenCalledWith(
      'Cloud Composer API is disabled in project durczokj-1-237346.'
    );
    expect(setters.setApiEnableUrl).toHaveBeenCalledWith([
      `${GLOBAL_CONSOLE}/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346`
    ]);
  });

  it('shows other 403s in the banner without a link', () => {
    // The list screens render the error only inside the banner, so other
    // 403s (missing IAM permission, billing disabled) must set it too.
    setConsoleOrigin(EU_CONSOLE);
    const setters = makeSetters();
    showForbiddenError(iamPermissionDenied(), setters);
    expect(setters.setIsApiError).toHaveBeenCalledWith(true);
    expect(setters.setApiEnableUrl).toHaveBeenCalledWith([]);
    expect(setters.setApiError).toHaveBeenCalledWith(
      "Permission 'aiplatform.schedules.list' denied on resource '//aiplatform.googleapis.com/projects/durczokj-1-237346/locations/us-central1' (or it may not exist)."
    );
  });

  it('keeps the global Console URL of other 403s off the banner', () => {
    setConsoleOrigin(EU_CONSOLE);
    const setters = makeSetters();
    showForbiddenError(iamPermissionDenied(), setters);
    expect(setters.setApiError.mock.calls[0][0]).not.toContain('console.');
  });

  it('shows a generic text for other 403s without a message', () => {
    const setters = makeSetters();
    showForbiddenError({ code: 403 }, setters);
    expect(setters.setIsApiError).toHaveBeenCalledWith(true);
    expect(setters.setApiError).toHaveBeenCalledWith('Permission denied.');
    expect(setters.setApiEnableUrl).toHaveBeenCalledWith([]);
  });
});
