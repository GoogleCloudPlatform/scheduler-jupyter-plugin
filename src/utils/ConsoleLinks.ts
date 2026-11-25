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
 * config key. When it is missing or invalid (another JupyterLab host, or
 * Workbench couldn't resolve the Console), links point to public
 * documentation for the same task, never to a Console the user may not belong
 * to.
 *
 * Each link is a `ConsoleLinkDefinition` constant (path, docs fallback, and on
 * which Consoles the page exists). `ConsoleLinkResolver.urlFor` is the only
 * place that decides between the Console page and the docs.
 */

import { PageConfig } from '@jupyterlab/coreutils';

const GLOBAL_CONSOLE_ORIGIN = 'https://console.cloud.google.com';

// The global Console or a Jurisdictional Console, e.g.
// https://console.eu.cloud.google.com.
const CONSOLE_ORIGIN_PATTERN =
  /^https:\/\/console(\.[a-z]+)?\.cloud\.google\.com$/;

export const LOGS_DOC_URL =
  'https://cloud.google.com/logging/docs/view/logs-explorer-interface';
export const KMS_DOC_URL = 'https://cloud.google.com/kms/docs/create-key-ring';
export const ENABLE_API_DOC_URL =
  'https://cloud.google.com/service-usage/docs/enable-disable';

// ---------------------------------------------------------------------------
// Where the Console origin comes from.
// ---------------------------------------------------------------------------

export interface IConsoleOriginSource {
  /** The validated Console origin, or null if there is none. */
  getOrigin(): string | null;
}

/** Reads `consoleOrigin` from JupyterLab page config (published by Workbench). */
export class PageConfigOriginSource implements IConsoleOriginSource {
  getOrigin(): string | null {
    const origin = PageConfig.getOption('consoleOrigin');
    if (CONSOLE_ORIGIN_PATTERN.test(origin)) {
      return origin;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Strategy: on which Consoles a page exists. Stateless, so one instance each.
// ---------------------------------------------------------------------------

export interface IConsoleAvailability {
  isAvailableOn(origin: string): boolean;
}

/** The page exists on the global and on every Jurisdictional Console. */
class AnyConsole implements IConsoleAvailability {
  isAvailableOn(origin: string): boolean {
    return true;
  }
}

/**
 * The page exists only on the global Console. Jurisdictional Consoles have no
 * API details page: on the US Jurisdictional Console,
 * /apis/api/<service>/overview returns "URL not found" even though the
 * project opens.
 */
class GlobalConsoleOnly implements IConsoleAvailability {
  isAvailableOn(origin: string): boolean {
    return origin === GLOBAL_CONSOLE_ORIGIN;
  }
}

export const ANY_CONSOLE: IConsoleAvailability = new AnyConsole();
export const GLOBAL_CONSOLE_ONLY: IConsoleAvailability =
  new GlobalConsoleOnly();

// ---------------------------------------------------------------------------
// A link definition: everything that differs between links.
// ---------------------------------------------------------------------------

export class ConsoleLinkDefinition<TArgs> {
  constructor(
    /** Builds the Console path (starting with "/") from the link's arguments. */
    readonly buildPath: (args: TArgs) => string,
    /** Public docs page used when the Console page can't be linked. */
    readonly docsUrl: string,
    /** On which Consoles the page exists. */
    readonly availability: IConsoleAvailability
  ) {}
}

/** "?a=1&b=2", leaving out undefined values. */
function query(values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }
  return '?' + params.toString();
}

/** Logs Explorer filtered to one notebook execution job run. */
export const LOGS_LINK = new ConsoleLinkDefinition(
  (args: { projectId: string; jobRunId: string; startDate?: string }) =>
    '/logs/query' +
    query({
      query: `SEARCH("${args.jobRunId}")`,
      cursorTimestamp: args.startDate,
      project: args.projectId
    }),
  LOGS_DOC_URL,
  ANY_CONSOLE
);

/** Cloud KMS key rings of a project. */
export const KMS_LINK = new ConsoleLinkDefinition(
  (args: { projectId: string }) =>
    '/security/kms/keyrings' + query({ project: args.projectId }),
  KMS_DOC_URL,
  ANY_CONSOLE
);

/** The page that enables a Google API (e.g. "composer.googleapis.com") in a project. */
export const ENABLE_API_LINK = new ConsoleLinkDefinition(
  (args: { service: string; project: string }) =>
    `/apis/api/${encodeURIComponent(args.service)}/overview` +
    query({ project: args.project }),
  ENABLE_API_DOC_URL,
  GLOBAL_CONSOLE_ONLY
);

// ---------------------------------------------------------------------------
// The resolver: the same for every link. The single decision point.
// ---------------------------------------------------------------------------

export class ConsoleLinkResolver {
  constructor(private readonly originSource: IConsoleOriginSource) {}

  /** The Console page if it exists on this instance's Console, the docs otherwise. */
  urlFor<TArgs>(link: ConsoleLinkDefinition<TArgs>, args: TArgs): string {
    const origin = this.originSource.getOrigin();
    if (origin === null) {
      return link.docsUrl;
    }
    if (!link.availability.isAvailableOn(origin)) {
      return link.docsUrl;
    }
    return origin + link.buildPath(args);
  }
}

// ---------------------------------------------------------------------------
// Composition root: the resolver the plugin uses.
// ---------------------------------------------------------------------------

export const consoleLinks = new ConsoleLinkResolver(
  new PageConfigOriginSource()
);
