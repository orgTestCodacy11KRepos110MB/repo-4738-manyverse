// SPDX-FileCopyrightText: 2018-2023 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import {Stream} from 'xstream';
import {DialogSource} from '~frontend/drivers/dialogs';
import {t} from '~frontend/drivers/localization';
import {Palette} from '~frontend/global-styles/palette';
import {FileLite} from './types';

export interface Actions {
  openContentWarning$: Stream<any>;
  addPicture$: Stream<FileLite>;
}

export default function dialog(actions: Actions, dialogSource: DialogSource) {
  return {
    updateContentWarning$: actions.openContentWarning$
      .map(() =>
        dialogSource.prompt(
          t('compose.dialogs.content_warning.title'),
          t('compose.dialogs.content_warning.description'),
          {
            ...Palette.dialogColors,
            positiveText: t('call_to_action.done'),
            negativeText: t('call_to_action.cancel'),
          },
        ),
      )
      .flatten()
      .filter((res) => res.action === 'actionPositive')
      .map((res) => (res as any).text as string),

    addPictureWithCaption$: actions.addPicture$
      .map((image) =>
        dialogSource
          .prompt(
            t('compose.dialogs.image_caption.title'),
            t('compose.dialogs.image_caption.description'),
            {
              ...Palette.dialogColors,
              positiveColor: Palette.textDialogStrong,
              positiveText: t('call_to_action.done'),
            },
          )
          .map((res) => ({caption: (res as any).text, image})),
      )
      .flatten(),
  };
}
