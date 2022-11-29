// SPDX-FileCopyrightText: 2020-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import {PureComponent, createElement as $} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {getStatusBarHeight} from 'react-native-status-bar-height';
import {t} from '~frontend/drivers/localization';
import {Palette} from '~frontend/global-styles/palette';
import {Dimensions} from '~frontend/global-styles/dimens';
import {Typography} from '~frontend/global-styles/typography';
import {IconNames} from '~frontend/global-styles/icons';
import HeaderButton from './HeaderButton';

const container: ViewStyle = {
  height: Dimensions.toolbarHeight,
  paddingTop: getStatusBarHeight(true),
  alignSelf: 'stretch',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-start',
  ...Platform.select({
    web: {
      '-webkit-app-region': 'drag',
    },
  }),
};

const title: TextStyle = {
  fontSize: Typography.fontSizeLarge,
  fontFamily: Typography.fontFamilyReadableText,
  fontWeight: 'bold',
  ...Platform.select({
    ios: {
      position: 'absolute',
      top: Dimensions.verticalSpaceTiny,
      bottom: 0,
      left: 40,
      right: 40,
      textAlign: 'center',
      marginLeft: 0,
    },
    default: {
      marginLeft: Dimensions.horizontalSpaceLarge,
    },
  }),
};

const styles = StyleSheet.create({
  containerBlank: {
    ...container,
    backgroundColor: Palette.backgroundText,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.textLine,
    ...Platform.select({
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

  containerBrand: {
    ...container,
    backgroundColor: Palette.brandMain,
    borderBottomWidth: 0,
  },

  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: Dimensions.horizontalSpaceBig,
    ...Platform.select({
      web: {
        width: Dimensions.desktopMiddleWidth.px,
        maxWidth: Dimensions.desktopMiddleWidth.px,
      },
    }),
  },

  titleBlank: {
    ...title,
    color: Palette.text,
  },

  titleBrand: {
    ...title,
    color: Palette.textForBackgroundBrand,
  },

  rightSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  backOnIOS: {
    marginLeft: -HeaderButton.size * 0.5,
    width: HeaderButton.size * 2,
    maxWidth: HeaderButton.size * 2,
    justifyContent: 'flex-start',
  },

  backOnIOSSmall: {
    marginLeft: -HeaderButton.size * 0.5,
    width: HeaderButton.size,
    maxWidth: HeaderButton.size,
    justifyContent: 'flex-start',
  },
});

export interface Props {
  title?: string;
  onPressBack?: () => void;
  theme?: 'brand' | 'blank';
  style?: StyleProp<ViewStyle>;
  smallerIOSBackButton?: boolean;
}

export default class TopBar extends PureComponent<Props> {
  constructor(props: Props) {
    super(props);
  }

  private _onPressBack = () => {
    this.props.onPressBack?.();
  };

  public render() {
    const {title, style, smallerIOSBackButton} = this.props;

    const theme = this.props.theme ?? 'blank';
    const containerStyle =
      theme === 'blank' ? styles.containerBlank : styles.containerBrand;
    const titleStyle =
      theme === 'blank' ? styles.titleBlank : styles.titleBrand;
    const headerButtonColor =
      theme === 'blank' ? undefined : Palette.textForBackgroundBrand;

    return $(View, {key: 'outer', style: [containerStyle, style]}, [
      $(View, {key: 'inner', style: styles.innerContainer}, [
        $(HeaderButton, {
          key: 'back',
          onPress: this._onPressBack,
          color: headerButtonColor,
          ...Platform.select({
            ios: {
              icon: IconNames.backButtonIOS,
              iconSize: Dimensions.iconSizeLarge,
              style: smallerIOSBackButton
                ? styles.backOnIOSSmall
                : styles.backOnIOS,
            },
            default: {
              icon: IconNames.backButton,
            },
          }),
          accessibilityLabel: t('call_to_action.go_back.accessibility_label'),
        }),
        title ? $(Text, {key: 'title', style: titleStyle}, title) : null,
        this.props.children
          ? $(
              View,
              {key: 'right', style: styles.rightSide},
              this.props.children,
            )
          : null,
      ]),
    ]);
  }
}
