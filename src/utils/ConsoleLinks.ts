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

/** A `google.rpc.ErrorInfo` entry in a Google API error's `details`. */
export interface IErrorInfo {
  '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
  reason?: string;
  domain?: string;
  metadata?: Record<string, string>;
}

/** The `error` object of a Google API error response (`google.rpc.Status`). */
export interface IGoogleApiError {
  code?: number;
  message?: string;
  status?: string;
  details?: unknown[];
}

/** Text and link of the "API disabled" banner. */
export interface IEnableApiBanner {
  /** Banner text, e.g. "Cloud Translation API is disabled in project 123." */
  message: string;
  /** Where "Click here to enable it." points. */
  url: string;
}

const ERROR_INFO_TYPE = 'type.googleapis.com/google.rpc.ErrorInfo';
const SERVICE_DISABLED_REASON = 'SERVICE_DISABLED';
const FALLBACK_MESSAGE = 'A required API is disabled.';

const SERVICE_PATTERN = /^[a-z0-9.-]+\.googleapis\.com$/;
// The API echoes the project the request named: a project number
// ("projects/123") or a project ID, optionally domain-scoped
// ("projects/my-project", "projects/example.com:my-project").
const CONSUMER_PATTERN =
  /^projects\/(\d+|(?:[a-z0-9.-]+:)?[a-z][a-z0-9-]{4,28}[a-z0-9])$/;

function isServiceDisabledInfo(detail: unknown): detail is IErrorInfo {
  const info = detail as IErrorInfo | null;
  return (
    info?.['@type'] === ERROR_INFO_TYPE &&
    info?.reason === SERVICE_DISABLED_REASON
  );
}

/**
 * Returns the "API disabled" banner for a Google API error, or null if the
 * error isn't one (no google.rpc.ErrorInfo with reason SERVICE_DISABLED).
 *
 * Only the structured ErrorInfo fields are used, never the error message: the
 * URL the API puts there always points to the global Console.
 */
export function getEnableApiBanner(
  error: IGoogleApiError | null | undefined
): IEnableApiBanner | null {
  const details: unknown = error?.details;
  const info = (Array.isArray(details) ? details : []).find(
    isServiceDisabledInfo
  );
  if (!info) {
    return null;
  }
  const metadata = info.metadata ?? {};
  const service = String(metadata.service ?? '');
  const project = CONSUMER_PATTERN.exec(String(metadata.consumer ?? ''))?.[1];
  const title = String(metadata.serviceTitle ?? '');

  const url =
    SERVICE_PATTERN.test(service) && project
      ? consoleOrDocsUrl(
          `/apis/api/${service}/overview?project=${encodeURIComponent(project)}`,
          ENABLE_API_DOC_URL
        )
      : ENABLE_API_DOC_URL;

  let message = FALLBACK_MESSAGE;
  if (title && project) {
    message = `${title} is disabled in project ${project}.`;
  } else if (title) {
    message = `${title} is disabled.`;
  }
  return { message, url };
}
