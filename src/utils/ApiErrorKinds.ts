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
 * Turns Google API errors into the scheduler's error banner.
 *
 * Each error kind that needs its own banner is a class registered under its
 * `google.rpc.ErrorInfo` reason. Every other error falls back to
 * `DefaultKind`, which never shows a link. URLs in error messages are never
 * turned into links: they point to the global Console.
 */

import {
  ConsoleLinkResolver,
  ENABLE_API_DOC_URL,
  ENABLE_API_LINK,
  consoleLinks
} from './ConsoleLinks';

// ---------------------------------------------------------------------------
// Google API error shapes (google.rpc.Status and google.rpc.ErrorInfo).
// ---------------------------------------------------------------------------

/** The `error` object of a Google API error response. */
export interface IGoogleApiError {
  code?: number;
  message?: string;
  status?: string;
  details?: unknown[];
}

/** A `google.rpc.ErrorInfo` entry in `details`. */
export interface IErrorInfo {
  '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
  reason?: string;
  domain?: string;
  metadata?: Record<string, string>;
}

const ERROR_INFO_TYPE = 'type.googleapis.com/google.rpc.ErrorInfo';

/** The first ErrorInfo in the error's details, or null. */
export function findErrorInfo(
  error: IGoogleApiError | null | undefined
): IErrorInfo | null {
  if (!error || !Array.isArray(error.details)) {
    return null;
  }
  for (const detail of error.details) {
    const candidate = detail as IErrorInfo | null;
    if (candidate && candidate['@type'] === ERROR_INFO_TYPE) {
      return candidate;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// What the banner shows.
// ---------------------------------------------------------------------------

export interface IBanner {
  /** The banner text. */
  message: string;
  /** Where "Click here to enable it." points, or null for no link. */
  url: string | null;
}

// ---------------------------------------------------------------------------
// Error kinds: one class per ErrorInfo reason that needs its own banner.
// ---------------------------------------------------------------------------

export interface IErrorKind {
  /** The ErrorInfo reason this kind handles, e.g. "SERVICE_DISABLED". */
  readonly reason: string;
  toBanner(info: IErrorInfo, error: IGoogleApiError): IBanner;
}

const SERVICE_PATTERN = /^[a-z0-9.-]+\.googleapis\.com$/;
// The API echoes the project the request named: "projects/123",
// "projects/my-project" or "projects/example.com:my-project".
const CONSUMER_PATTERN =
  /^projects\/(\d+|(?:[a-z0-9.-]+:)?[a-z][a-z0-9-]{4,28}[a-z0-9])$/;

/**
 * A Google API is disabled in the project. Only the structured ErrorInfo
 * fields are read: the URL in the error message always points to the global
 * Console.
 */
export class ServiceDisabledKind implements IErrorKind {
  readonly reason = 'SERVICE_DISABLED';

  constructor(private readonly links: ConsoleLinkResolver) {}

  toBanner(info: IErrorInfo, error: IGoogleApiError): IBanner {
    const metadata = info.metadata ?? {};
    const service = this.validService(metadata.service);
    const project = this.validProject(metadata.consumer);
    const title = metadata.serviceTitle;

    let url = ENABLE_API_DOC_URL;
    if (service !== null && project !== null) {
      url = this.links.urlFor(ENABLE_API_LINK, { service, project });
    }

    let message = 'A required API is disabled.';
    if (title && project !== null) {
      message = `${title} is disabled in project ${project}.`;
    } else if (title) {
      message = `${title} is disabled.`;
    }

    return { message, url };
  }

  private validService(service: string | undefined): string | null {
    if (service && SERVICE_PATTERN.test(service)) {
      return service;
    }
    return null;
  }

  private validProject(consumer: string | undefined): string | null {
    if (!consumer) {
      return null;
    }
    const match = CONSUMER_PATTERN.exec(consumer);
    if (match === null) {
      return null;
    }
    return match[1];
  }
}

/**
 * Every error without a registered kind. Shows the first sentence of the
 * message and never a link: messages such as IAM_PERMISSION_DENIED continue
 * with a global Console URL (the IAM Troubleshooter).
 */
export class DefaultKind {
  toBanner(error: IGoogleApiError): IBanner {
    const message = error.message ?? '';
    const firstSentence = message.split('. ')[0].trim();
    if (firstSentence === '') {
      return { message: 'Permission denied.', url: null };
    }
    if (firstSentence.endsWith('.')) {
      return { message: firstSentence, url: null };
    }
    return { message: firstSentence + '.', url: null };
  }
}

// ---------------------------------------------------------------------------
// Registry: ErrorInfo reason -> error kind, with DefaultKind as the fallback.
// ---------------------------------------------------------------------------

export class ErrorKindRegistry {
  private readonly kindsByReason = new Map<string, IErrorKind>();

  constructor(
    kinds: IErrorKind[],
    private readonly fallback: DefaultKind
  ) {
    for (const kind of kinds) {
      if (this.kindsByReason.has(kind.reason)) {
        throw new Error(`Duplicate error kind for reason ${kind.reason}`);
      }
      this.kindsByReason.set(kind.reason, kind);
    }
  }

  toBanner(error: IGoogleApiError): IBanner {
    const info = findErrorInfo(error);
    if (info === null || !info.reason) {
      return this.fallback.toBanner(error);
    }
    const kind = this.kindsByReason.get(info.reason);
    if (kind === undefined) {
      return this.fallback.toBanner(error);
    }
    return kind.toBanner(info, error);
  }
}

// ---------------------------------------------------------------------------
// Composition root: the kinds the plugin knows. Add new kinds to this list.
// ---------------------------------------------------------------------------

export const errorKinds = new ErrorKindRegistry(
  [new ServiceDisabledKind(consoleLinks)],
  new DefaultKind()
);
