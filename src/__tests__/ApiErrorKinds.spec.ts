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

import {
  ConsoleLinkResolver,
  ENABLE_API_DOC_URL,
  IConsoleOriginSource
} from '../utils/ConsoleLinks';
import {
  DefaultKind,
  ErrorKindRegistry,
  IErrorInfo,
  IErrorKind,
  ServiceDisabledKind,
  findErrorInfo
} from '../utils/ApiErrorKinds';
import {
  composerDisabled,
  iamPermissionDenied,
  translationDisabled
} from './serviceDisabledFixtures';

const GLOBAL = 'https://console.cloud.google.com';
const EU = 'https://console.eu.cloud.google.com';

function resolverFor(origin: string | null): ConsoleLinkResolver {
  const source: IConsoleOriginSource = { getOrigin: () => origin };
  return new ConsoleLinkResolver(source);
}

/** The SERVICE_DISABLED ErrorInfo of a fixture. */
function infoOf(error: { details: unknown[] }): IErrorInfo {
  return error.details[0] as IErrorInfo;
}

describe('findErrorInfo', () => {
  it('returns the ErrorInfo entry, skipping other detail types', () => {
    expect(findErrorInfo(translationDisabled())?.reason).toBe(
      'SERVICE_DISABLED'
    );
  });

  it.each([undefined, null, {}, { details: 'x' }, { details: [{}] }])(
    'returns null for %j',
    error => {
      expect(findErrorInfo(error as any)).toBeNull();
    }
  );
});

describe('ServiceDisabledKind', () => {
  it('links the global Console API page (project ID)', () => {
    const kind = new ServiceDisabledKind(resolverFor(GLOBAL));
    const error = composerDisabled();
    expect(kind.toBanner(infoOf(error), error)).toEqual({
      message: 'Cloud Composer API is disabled in project durczokj-1-237346.',
      url: `${GLOBAL}/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346`
    });
  });

  it('reads a project number', () => {
    const kind = new ServiceDisabledKind(resolverFor(GLOBAL));
    const error = translationDisabled();
    expect(kind.toBanner(infoOf(error), error).message).toBe(
      'Cloud Translation API is disabled in project 1007353032215.'
    );
  });

  it('links the docs on a Jurisdictional Console', () => {
    const kind = new ServiceDisabledKind(resolverFor(EU));
    const error = composerDisabled();
    expect(kind.toBanner(infoOf(error), error).url).toBe(ENABLE_API_DOC_URL);
  });

  it('never links the URL from the error message', () => {
    for (const origin of [GLOBAL, EU, null]) {
      const kind = new ServiceDisabledKind(resolverFor(origin));
      const error = translationDisabled();
      const banner = kind.toBanner(infoOf(error), error);
      expect(banner.url).not.toContain('console.developers');
      expect(banner.message).not.toContain('https://');
    }
  });

  it.each(['projects/', 'projects/My-Project', 'projects/a/b', 'folders/123'])(
    'links the docs and drops the project for consumer %j',
    consumer => {
      const kind = new ServiceDisabledKind(resolverFor(GLOBAL));
      const error = composerDisabled();
      error.details[0].metadata.consumer = consumer;
      expect(kind.toBanner(infoOf(error), error)).toEqual({
        message: 'Cloud Composer API is disabled.',
        url: ENABLE_API_DOC_URL
      });
    }
  );

  it('links the docs for a service outside googleapis.com', () => {
    const kind = new ServiceDisabledKind(resolverFor(GLOBAL));
    const error = composerDisabled();
    error.details[0].metadata.service = 'evil.com/x';
    expect(kind.toBanner(infoOf(error), error).url).toBe(ENABLE_API_DOC_URL);
  });

  it('uses a fixed message without serviceTitle', () => {
    const kind = new ServiceDisabledKind(resolverFor(GLOBAL));
    const error = composerDisabled();
    delete (error.details[0].metadata as any).serviceTitle;
    expect(kind.toBanner(infoOf(error), error).message).toBe(
      'A required API is disabled.'
    );
  });
});

describe('DefaultKind', () => {
  it('shows the first sentence without the global Console URL', () => {
    expect(new DefaultKind().toBanner(iamPermissionDenied())).toEqual({
      message:
        "Permission 'aiplatform.schedules.list' denied on resource '//aiplatform.googleapis.com/projects/durczokj-1-237346/locations/us-central1' (or it may not exist).",
      url: null
    });
  });

  it('adds the final period when missing', () => {
    expect(new DefaultKind().toBanner({ message: 'Forbidden' })).toEqual({
      message: 'Forbidden.',
      url: null
    });
  });

  it('uses a generic text without a message', () => {
    expect(new DefaultKind().toBanner({ code: 403 })).toEqual({
      message: 'Permission denied.',
      url: null
    });
  });
});

describe('ErrorKindRegistry', () => {
  const fakeKind: IErrorKind = {
    reason: 'SERVICE_DISABLED',
    toBanner: () => ({ message: 'from kind', url: 'https://example.com' })
  };
  const registry = new ErrorKindRegistry([fakeKind], new DefaultKind());

  it('routes a registered reason to its kind', () => {
    expect(registry.toBanner(composerDisabled())).toEqual({
      message: 'from kind',
      url: 'https://example.com'
    });
  });

  it('routes an unregistered reason to the fallback, without a link', () => {
    expect(registry.toBanner(iamPermissionDenied()).url).toBeNull();
  });

  it('routes an error without ErrorInfo to the fallback', () => {
    expect(registry.toBanner({ code: 403, message: 'Forbidden' })).toEqual({
      message: 'Forbidden.',
      url: null
    });
  });

  it('rejects two kinds for the same reason', () => {
    expect(
      () => new ErrorKindRegistry([fakeKind, fakeKind], new DefaultKind())
    ).toThrow('Duplicate error kind for reason SERVICE_DISABLED');
  });
});
