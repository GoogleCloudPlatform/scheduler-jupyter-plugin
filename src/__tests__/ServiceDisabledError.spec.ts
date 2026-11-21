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

import { parseServiceDisabledError } from '../utils/ServiceDisabledError';
import {
  composerDisabled,
  iamPermissionDenied,
  translationDisabled
} from './serviceDisabledFixtures';

describe('parseServiceDisabledError', () => {
  it('reads a project number (Cloud Translation)', () => {
    expect(parseServiceDisabledError(translationDisabled())).toEqual({
      service: 'translate.googleapis.com',
      project: '1007353032215',
      title: 'Cloud Translation API'
    });
  });

  it('reads a project ID (Cloud Composer)', () => {
    expect(parseServiceDisabledError(composerDisabled())).toEqual({
      service: 'composer.googleapis.com',
      project: 'durczokj-1-237346',
      title: 'Cloud Composer API'
    });
  });

  it('reads a domain-scoped project ID', () => {
    const error = composerDisabled();
    error.details[0].metadata.consumer = 'projects/example.com:my-project';
    expect(parseServiceDisabledError(error)?.project).toBe(
      'example.com:my-project'
    );
  });

  it.each(['projects/', 'projects/My-Project', 'projects/a/b', 'folders/123'])(
    'drops consumer %j',
    consumer => {
      const error = composerDisabled();
      error.details[0].metadata.consumer = consumer;
      expect(parseServiceDisabledError(error)?.project).toBeUndefined();
    }
  );

  it('drops a service outside googleapis.com', () => {
    const error = composerDisabled();
    error.details[0].metadata.service = 'evil.com/x';
    expect(parseServiceDisabledError(error)?.service).toBeUndefined();
  });

  it('leaves missing fields undefined', () => {
    const error = composerDisabled();
    delete error.details[0].metadata.serviceTitle;
    delete error.details[0].metadata.consumer;
    expect(parseServiceDisabledError(error)).toEqual({
      service: 'composer.googleapis.com',
      project: undefined,
      title: undefined
    });
  });

  it('ignores the URLs in the message, activationUrl and Help links', () => {
    const parsed = parseServiceDisabledError(translationDisabled());
    expect(JSON.stringify(parsed)).not.toContain('console.developers');
  });

  it('returns null for other 403s', () => {
    expect(parseServiceDisabledError(iamPermissionDenied())).toBeNull();
  });

  it.each([undefined, null, {}, { code: 403, message: 'Forbidden' }])(
    'returns null for %j',
    error => {
      expect(parseServiceDisabledError(error)).toBeNull();
    }
  );
});
