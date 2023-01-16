// SPDX-FileCopyrightText: 2018-2023 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import {Stream} from 'xstream';
import dropRepeatsByKeys from 'xstream-drop-repeats-by-keys';
import {ReactSource} from '@cycle/react';
import {ReactElement} from 'react';
import {h} from '@cycle/react';
import {StateSource} from '@cycle/state';
import {View, StyleSheet, Platform} from 'react-native';
import {getStatusBarHeight} from 'react-native-status-bar-height';
import {t} from '~frontend/drivers/localization';
import {Palette} from '~frontend/global-styles/palette';
import {IconNames} from '~frontend/global-styles/icons';
import {Dimensions} from '~frontend/global-styles/dimens';
import Button from '~frontend/components/Button';
import HeaderButton from '~frontend/components/HeaderButton';

export interface State {
  enabled: boolean;
  previewing: boolean;
  isReply: boolean;
  postTextTooLong: boolean;
}

export interface Sources {
  screen: ReactSource;
  state: StateSource<State>;
}

export interface Sinks {
  screen: Stream<ReactElement<any>>;
  back: Stream<any>;
  done: Stream<any>;
  openError: Stream<any>;
}

export const styles = StyleSheet.create({
  container: {
    height: Dimensions.toolbarHeight,
    paddingTop: getStatusBarHeight(true),
    alignSelf: 'stretch',
    backgroundColor: Palette.backgroundText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.textLine,
    ...Platform.select({
      web: {
        '-webkit-app-region': 'drag',
      },
      android: {
        elevation: 3,
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: -1},
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      ios: {
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: -1},
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
    }),
  },

  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Dimensions.horizontalSpaceBig,
    ...Platform.select({
      web: {
        width: Dimensions.desktopMiddleWidth.px,
        maxWidth: Dimensions.desktopMiddleWidth.px,
      },
    }),
  },

  buttonsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  previewButton: {
    minWidth: 80,
  },

  publishButton: {
    minWidth: 80,
  },

  replyButton: {
    minWidth: 68,
  },

  buttonEnabled: {
    backgroundColor: 'transparent',
    borderColor: Palette.textBrand,
    borderWidth: 1,
  },

  buttonEnabledStrong: {
    backgroundColor: Palette.backgroundCTA,
  },

  buttonDisabled: {
    backgroundColor: 'transparent',
    borderColor: Palette.textVeryWeak,
    borderWidth: 1,
  },

  buttonTextEnabled: {
    color: Palette.textBrand,
  },

  buttonTextEnabledStrong: {
    color: Palette.textForBackgroundBrand,
  },

  buttonTextDisabled: {
    color: Palette.textVeryWeak,
  },

  buttonsSpacer: {
    width: Dimensions.horizontalSpaceNormal,
  },
});

function intent(reactSource: ReactSource) {
  return {
    back$: reactSource.select('composeCloseButton').events('press'),
    done$: reactSource.select('composeDoneButton').events('press'),
    openError$: reactSource.select('composeErrorButton').events('press'),
  };
}

function view(state$: Stream<State>) {
  return state$
    .compose(
      dropRepeatsByKeys([
        'enabled',
        'isReply',
        'previewing',
        'postTextTooLong',
      ]),
    )
    .map((state) =>
      h(View, {key: 'c', style: styles.container}, [
        h(View, {key: 'ic', style: styles.innerContainer}, [
          h(HeaderButton, {
            key: 'b1',
            sel: 'composeCloseButton',
            icon: state.previewing
              ? IconNames.compose
              : state.isReply
              ? IconNames.exitFullScreen
              : Platform.OS === 'ios'
              ? IconNames.backButtonIOS
              : IconNames.backButton,
            ...Platform.select({
              ios:
                !state.previewing && !state.isReply
                  ? {iconSize: Dimensions.iconSizeLarge}
                  : undefined,
            }),
            accessibilityLabel: t(
              'compose.call_to_action.close.accessibility_label',
            ),
          }),

          h(View, {key: 'v', style: styles.buttonsRight}, [
            state.postTextTooLong
              ? h(HeaderButton, {
                  key: 'b2',
                  sel: 'composeErrorButton',
                  icon: IconNames.error,
                  color: Palette.textBrand,
                  accessibilityLabel: t(
                    'compose.alert_compose_error.view_problem.accessibility_label',
                  ),
                })
              : null,

            h(View, {style: styles.buttonsSpacer}),

            h(Button, {
              key: 'b3',
              sel: 'composeDoneButton',
              strong: state.enabled,
              style: [
                // Colors:
                state.enabled && !state.previewing
                  ? styles.buttonEnabled
                  : state.enabled && state.previewing
                  ? styles.buttonEnabledStrong
                  : styles.buttonDisabled,

                // Width:
                !state.previewing
                  ? styles.previewButton
                  : state.isReply
                  ? styles.replyButton
                  : styles.publishButton,
              ],
              textStyle:
                state.enabled && !state.previewing
                  ? styles.buttonTextEnabled
                  : state.enabled && state.previewing
                  ? styles.buttonTextEnabledStrong
                  : styles.buttonTextDisabled,

              text: !state.previewing
                ? t('compose.call_to_action.preview.label')
                : state.isReply
                ? t('compose.call_to_action.reply_to_thread.label')
                : t('compose.call_to_action.publish_new_thread.label'),

              accessible: true,
              accessibilityLabel: !state.previewing
                ? t('compose.call_to_action.preview.accessibility_label')
                : state.isReply
                ? t(
                    'compose.call_to_action.reply_to_thread.accessibility_label',
                  )
                : t(
                    'compose.call_to_action.publish_new_thread.accessibility_label',
                  ),
            }),
          ]),
        ]),
      ]),
    );
}

export function topBar(sources: Sources): Sinks {
  const actions = intent(sources.screen);
  const vdom$ = view(sources.state.stream);

  return {
    screen: vdom$,
    back: actions.back$,
    done: actions.done$,
    openError: actions.openError$,
  };
}
