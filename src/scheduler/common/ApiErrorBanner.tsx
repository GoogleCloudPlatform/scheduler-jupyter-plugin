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

import React from 'react';

/**
 * The scheduler's API error banner: the error text, followed by an enable link
 * when there is one (see ForbiddenErrorPresenter).
 */
const ApiErrorBanner = ({
  message,
  url
}: {
  message: string;
  url: string[] | null;
}): JSX.Element => {
  let enableUrl: string | null = null;
  if (url && url.length > 0) {
    enableUrl = url[0];
  }

  if (enableUrl === null) {
    return <>{message}</>;
  }

  return (
    <>
      {message}{' '}
      <a
        href={enableUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-icon"
      >
        Click here
      </a>{' '}
      to enable it.
    </>
  );
};

export default ApiErrorBanner;
