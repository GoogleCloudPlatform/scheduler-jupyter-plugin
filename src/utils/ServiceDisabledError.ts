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
 * Reads Google API "API disabled" errors.
 *
 * Google APIs report a disabled API as a 403 whose `details` hold a
 * `google.rpc.ErrorInfo` with reason SERVICE_DISABLED (AIP-193). Only these
 * structured fields are read. The free-text message is not parsed: its wording
 * may change, and the URL in it always points to the global Console.
 */

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

/**
 * The validated fields of a SERVICE_DISABLED error. A field is undefined when
 * the API didn't send it or it doesn't have the expected form.
 */
export interface IServiceDisabled {
  /** API name, e.g. "composer.googleapis.com". */
  service?: string;
  /** Project number or ID that made the call, e.g. "my-project". */
  project?: string;
  /** Display name, e.g. "Cloud Composer API". */
  title?: string;
}

const ERROR_INFO_TYPE = 'type.googleapis.com/google.rpc.ErrorInfo';
const SERVICE_DISABLED_REASON = 'SERVICE_DISABLED';

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
 * Returns the fields of a SERVICE_DISABLED error, or null if `error` isn't
 * one.
 */
export function parseServiceDisabledError(
  error: IGoogleApiError | null | undefined
): IServiceDisabled | null {
  const details: unknown = error?.details;
  const info = (Array.isArray(details) ? details : []).find(
    isServiceDisabledInfo
  );
  if (!info) {
    return null;
  }
  const metadata = info.metadata ?? {};
  const service = String(metadata.service ?? '');
  const title = String(metadata.serviceTitle ?? '');
  return {
    service: SERVICE_PATTERN.test(service) ? service : undefined,
    project: CONSUMER_PATTERN.exec(String(metadata.consumer ?? ''))?.[1],
    title: title || undefined
  };
}
