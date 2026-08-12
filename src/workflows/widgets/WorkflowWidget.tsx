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

import { Widget, PanelLayout } from '@lumino/widgets';
import { IThemeManager } from '@jupyterlab/apputils';
import { TitleWidget } from './components/TitleBarWidget';
import { WORKFLOW_WIDGET_TITLE } from '../../utils/Const';

export class WorkflowWidget extends Widget {
  private readonly _titleWidget: TitleWidget;

  constructor(themeManager?: IThemeManager) {
    super();

    this.layout = new PanelLayout();
    this.node.style.height = '100%';
    this.node.style.display = 'flex';
    this.node.style.flexDirection = 'column';

    // Title widget for the workflow panel
    this._titleWidget = new TitleWidget(WORKFLOW_WIDGET_TITLE, true);
    (this.layout as PanelLayout).addWidget(this._titleWidget);
  }
}