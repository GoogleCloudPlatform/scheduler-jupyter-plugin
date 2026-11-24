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

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import EnableNotifyMessage from '../scheduler/common/EnableNotifyMessage';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function render(element: JSX.Element) {
  act(() => {
    root.render(element);
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('EnableNotifyMessage', () => {
  it('shows the message and the enable link', () => {
    const url = 'https://cloud.google.com/service-usage/docs/enable-disable';
    render(
      <EnableNotifyMessage
        message="Cloud Composer API is disabled in project p."
        url={[url]}
      />
    );
    expect(container.textContent).toBe(
      'Cloud Composer API is disabled in project p. Click here to enable it.'
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe(url);
  });

  it.each([[[]], [null]])(
    'shows only the message when the enable URLs are %j',
    url => {
      render(<EnableNotifyMessage message="Permission denied." url={url} />);
      expect(container.textContent).toBe('Permission denied.');
      expect(container.querySelector('a')).toBeNull();
    }
  );
});
