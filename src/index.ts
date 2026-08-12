/**
 * @license
 * Copyright 2025 Google LLC
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
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  JupyterLab
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  MainAreaWidget,
  IThemeManager,
  Notification
} from '@jupyterlab/apputils';
import { Panel } from '@lumino/widgets';
import { ILauncher } from '@jupyterlab/launcher';
import { NotebookScheduler } from './scheduler/NotebookScheduler';
import { SchedulerNotebookButtonExtension } from './controls/SchedulerNotebookButtonExtension';
import {
  PLUGIN_NAME,
  TITLE_LAUNCHER_CATEGORY,
  VERSION_DETAIL,
  WORKFLOW_WIDGET_TITLE
} from './utils/Const';
import { WorkflowWidget } from './workflows/widgets/WorkflowWidget';
import { requestAPI } from './handler/Handler';

import { iconScheduledNotebooks } from './utils/Icons';

/**
 * Initialization data for the scheduler-jupyter-plugin extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'scheduler-jupyter-plugin:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  optional: [ISettingRegistry, IThemeManager, ILauncher],
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null,
    themeManager: IThemeManager,
    launcher: ILauncher
  ) => {
    console.log('JupyterLab extension scheduler-jupyter-plugin is activated!');

    const { commands } = app;
    const createNotebookJobsComponentCommand = 'create-notebook-jobs-component';

    let panelWorkflow: Panel | null = null;

    try {
      const pluginSettings: any = await requestAPI('settings');
      if (pluginSettings?.enable_workflow_scheduler) {
        const workflowWidget = new WorkflowWidget(themeManager);

        panelWorkflow = new Panel();
        panelWorkflow.id = 'workflow-tab';
        panelWorkflow.title.caption = WORKFLOW_WIDGET_TITLE;
        panelWorkflow.title.className = 'panel-icons-custom-style';
        panelWorkflow.addWidget(workflowWidget);

        app.shell.add(panelWorkflow, 'left', { rank: 1003 });
      }
    } catch (error) {
      console.error('Failed to fetch scheduler plugin settings:', error);
    }

    async function jupyterVersionCheck() {
      try {
        const notificationMessage =
          'There is a new version of Scheduler Jupyter Plugin available. Would you like to update the extension?';
        const latestVersion = await requestAPI(
          `jupyterlabVersion?packageName=${PLUGIN_NAME}`,
          {
            method: 'GET'
          }
        );

        if (
          typeof latestVersion === 'string' &&
          latestVersion > VERSION_DETAIL
        ) {
          Notification.info(notificationMessage, {
            actions: [
              {
                label: 'Update',
                callback: () => {
                  console.log('Update JupyterLab to the latest version');
                  requestAPI(`updatePlugin?packageName=${PLUGIN_NAME}`, {
                    method: 'POST'
                  })
                    .then(() => {
                      // After successful update, refresh the application
                      window.location.reload();
                    })
                    .catch(updateError => {
                      Notification.error(`Update failed.${updateError}`);
                    });
                },
                displayType: 'accent'
              },
              {
                label: 'Ignore',
                callback: () => {
                  Notification.warning('Update Cancelled by user');
                },
                displayType: 'default'
              }
            ],
            autoClose: false
          });
        }
      } catch (error) {
        Notification.error(`Failed to fetch JupyterLab version:${error}`);
        throw error;
      }
    }

    commands.addCommand(createNotebookJobsComponentCommand, {
      caption: 'Scheduled Jobs',
      label: 'Scheduled Jobs',
      icon: iconScheduledNotebooks,
      execute: () => {
        const content = new NotebookScheduler(
          app as JupyterLab,
          themeManager,
          settingRegistry as ISettingRegistry,
          ''
        );
        const widget = new MainAreaWidget<NotebookScheduler>({ content });
        widget.title.label = 'Scheduled Jobs';
        widget.title.icon = iconScheduledNotebooks;
        app.shell.add(widget, 'main');
      }
    });

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new SchedulerNotebookButtonExtension(
        app as JupyterLab,
        settingRegistry as ISettingRegistry,
        themeManager
      )
    );

    if (launcher) {
      launcher.add({
        command: createNotebookJobsComponentCommand,
        category: TITLE_LAUNCHER_CATEGORY,
        rank: 4
      });
    }

    app.restored
      .then(async () => {
        await jupyterVersionCheck();
      })
      .catch(error => {
        console.error('Error during app restoration:', error);
      });
  }
};

export default plugin;
