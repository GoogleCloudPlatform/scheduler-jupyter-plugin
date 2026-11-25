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
  ANY_CONSOLE,
  ConsoleLinkDefinition,
  ConsoleLinkResolver,
  ENABLE_API_DOC_URL,
  ENABLE_API_LINK,
  GLOBAL_CONSOLE_ONLY,
  IConsoleOriginSource,
  KMS_DOC_URL,
  KMS_LINK,
  LOGS_DOC_URL,
  LOGS_LINK,
  PageConfigOriginSource
} from '../utils/ConsoleLinks';

const GLOBAL = 'https://console.cloud.google.com';
const US = 'https://console.us.cloud.google.com';
const EU = 'https://console.eu.cloud.google.com';

/** A resolver whose Console origin is fixed (null: no origin). */
function resolverFor(origin: string | null): ConsoleLinkResolver {
  const source: IConsoleOriginSource = { getOrigin: () => origin };
  return new ConsoleLinkResolver(source);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PageConfigOriginSource', () => {
  function setPageConfig(value: string) {
    jest
      .spyOn(PageConfig, 'getOption')
      .mockImplementation(key => (key === 'consoleOrigin' ? value : ''));
  }

  it.each([GLOBAL, US, EU])('accepts %s', origin => {
    setPageConfig(origin);
    expect(new PageConfigOriginSource().getOrigin()).toBe(origin);
  });

  it.each([
    '',
    'https://console.us-central1.cloud.google.com',
    'https://console.cloud.google.com/',
    'http://console.cloud.google.com',
    'https://console.cloud.google.com.evil.com',
    'https://console.developers.google.com'
  ])('rejects %j', origin => {
    setPageConfig(origin);
    expect(new PageConfigOriginSource().getOrigin()).toBeNull();
  });
});

describe('availability rules', () => {
  it.each([GLOBAL, US, EU])('ANY_CONSOLE allows %s', origin => {
    expect(ANY_CONSOLE.isAvailableOn(origin)).toBe(true);
  });

  it('GLOBAL_CONSOLE_ONLY allows only the global Console', () => {
    expect(GLOBAL_CONSOLE_ONLY.isAvailableOn(GLOBAL)).toBe(true);
    expect(GLOBAL_CONSOLE_ONLY.isAvailableOn(US)).toBe(false);
    expect(GLOBAL_CONSOLE_ONLY.isAvailableOn(EU)).toBe(false);
  });
});

describe('link paths', () => {
  it('LOGS_LINK queries the job run, with and without a start date', () => {
    expect(
      LOGS_LINK.buildPath({
        projectId: 'my-project',
        jobRunId: 'run-1',
        startDate: '2026-11-20T18:00:00Z'
      })
    ).toBe(
      '/logs/query?query=SEARCH%28%22run-1%22%29&cursorTimestamp=2026-11-20T18%3A00%3A00Z&project=my-project'
    );
    expect(
      LOGS_LINK.buildPath({ projectId: 'my-project', jobRunId: 'run-1' })
    ).toBe('/logs/query?query=SEARCH%28%22run-1%22%29&project=my-project');
  });

  it('KMS_LINK lists the project key rings', () => {
    expect(KMS_LINK.buildPath({ projectId: 'my-project' })).toBe(
      '/security/kms/keyrings?project=my-project'
    );
  });

  it('ENABLE_API_LINK encodes the project', () => {
    expect(
      ENABLE_API_LINK.buildPath({
        service: 'composer.googleapis.com',
        project: 'example.com:my-project'
      })
    ).toBe(
      '/apis/api/composer.googleapis.com/overview?project=example.com%3Amy-project'
    );
  });
});

describe('ConsoleLinkResolver', () => {
  const link = new ConsoleLinkDefinition(
    (args: { id: string }) => `/page/${args.id}`,
    'https://cloud.google.com/docs/page',
    GLOBAL_CONSOLE_ONLY
  );

  it('links the Console page where it exists', () => {
    expect(resolverFor(GLOBAL).urlFor(link, { id: '1' })).toBe(
      `${GLOBAL}/page/1`
    );
  });

  it('links the docs where the page does not exist', () => {
    expect(resolverFor(EU).urlFor(link, { id: '1' })).toBe(link.docsUrl);
  });

  it('links the docs without a Console origin', () => {
    expect(resolverFor(null).urlFor(link, { id: '1' })).toBe(link.docsUrl);
  });

  it.each([GLOBAL, US, EU])('links Cloud Logs and KMS on %s', origin => {
    const resolver = resolverFor(origin);
    expect(resolver.urlFor(KMS_LINK, { projectId: 'p' })).toBe(
      `${origin}/security/kms/keyrings?project=p`
    );
    expect(
      resolver.urlFor(LOGS_LINK, { projectId: 'p', jobRunId: 'r' })
    ).toMatch(new RegExp(`^${origin.replace(/\./g, '\\.')}/logs/query\\?`));
  });

  it('links the enable-API page only on the global Console', () => {
    const args = { service: 'composer.googleapis.com', project: 'p' };
    expect(resolverFor(GLOBAL).urlFor(ENABLE_API_LINK, args)).toBe(
      `${GLOBAL}/apis/api/composer.googleapis.com/overview?project=p`
    );
    expect(resolverFor(US).urlFor(ENABLE_API_LINK, args)).toBe(
      ENABLE_API_DOC_URL
    );
    expect(resolverFor(EU).urlFor(ENABLE_API_LINK, args)).toBe(
      ENABLE_API_DOC_URL
    );
  });

  it('links the docs for every link without a Console origin', () => {
    const resolver = resolverFor(null);
    expect(resolver.urlFor(LOGS_LINK, { projectId: 'p', jobRunId: 'r' })).toBe(
      LOGS_DOC_URL
    );
    expect(resolver.urlFor(KMS_LINK, { projectId: 'p' })).toBe(KMS_DOC_URL);
    expect(
      resolver.urlFor(ENABLE_API_LINK, {
        service: 's.googleapis.com',
        project: 'p'
      })
    ).toBe(ENABLE_API_DOC_URL);
  });
});
