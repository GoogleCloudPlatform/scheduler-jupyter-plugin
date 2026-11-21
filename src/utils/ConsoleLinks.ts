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

/**
 * Builds Cloud Console links for the Console this JupyterLab belongs to.
 *
 * Vertex AI Workbench publishes the origin of the instance's Console (the
 * global Console or a Jurisdictional Console such as
 * https://console.us.cloud.google.com) in the `consoleOrigin` JupyterLab page
 * config key. When the key is missing or invalid (another JupyterLab host, or
 * Workbench couldn't resolve the Console), links point to public documentation
 * for the same task, never to a Console the user may not belong to.
 */

import { PageConfig } from '@jupyterlab/coreutils';

const CONSOLE_ORIGIN_KEY = 'consoleOrigin';

// The global Console or a Jurisdictional Console, e.g.
// https://console.eu.cloud.google.com.
const CONSOLE_ORIGIN_PATTERN =
  /^https:\/\/console(\.[a-z]+)?\.cloud\.google\.com$/;

export const LOGS_DOC_URL =
  'https://cloud.google.com/logging/docs/view/logs-explorer-interface';
export const KMS_DOC_URL = 'https://cloud.google.com/kms/docs/create-key-ring';
export const ENABLE_API_DOC_URL =
  'https://cloud.google.com/service-usage/docs/enable-disable';

/**
 * Returns the Console origin from page config, or null if it's missing or
 * invalid.
 */
export function getConsoleOrigin(): string | null {
  const origin = PageConfig.getOption(CONSOLE_ORIGIN_KEY);
  return CONSOLE_ORIGIN_PATTERN.test(origin) ? origin : null;
}

/**
 * Returns `path` (starting with "/") on the Console origin, or `docsUrl` if
 * there's no valid origin.
 */
export function consoleOrDocsUrl(path: string, docsUrl: string): string {
  const origin = getConsoleOrigin();
  return origin === null ? docsUrl : `${origin}${path}`;
}

/** Logs Explorer filtered to one notebook execution job run. */
export function getLogsUrl(
  projectId: string,
  jobRunId: string,
  startDate?: string
): string {
  const params = new URLSearchParams({ query: `SEARCH("${jobRunId}")` });
  if (startDate) {
    params.set('cursorTimestamp', startDate);
  }
  params.set('project', projectId);
  return consoleOrDocsUrl(`/logs/query?${params.toString()}`, LOGS_DOC_URL);
}

/** Cloud KMS key rings of a project. */
export function getKmsUrl(projectId: string): string {
  const params = new URLSearchParams({ project: projectId });
  return consoleOrDocsUrl(
    `/security/kms/keyrings?${params.toString()}`,
    KMS_DOC_URL
  );
}

/** The page that enables `service` (e.g. "composer.googleapis.com") in `project`. */
export function getEnableApiUrl(service: string, project: string): string {
  const params = new URLSearchParams({ project });
  return consoleOrDocsUrl(
    `/apis/api/${encodeURIComponent(service)}/overview?${params.toString()}`,
    ENABLE_API_DOC_URL
  );
}
