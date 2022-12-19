// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import {Component} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {h} from '@cycle/react';
import {FeedId, Msg} from 'ssb-typescript';
import {MsgAndExtras} from '~frontend/ssb/types';
import {displayName} from '~frontend/ssb/utils/from-ssb';
import {Palette} from '~frontend/global-styles/palette';
import {Dimensions} from '~frontend/global-styles/dimens';
import {Typography} from '~frontend/global-styles/typography';
import Avatar from '~frontend/components/Avatar';
import TimeAgo from '~frontend/components/TimeAgo';
import HeaderButton from '~frontend/components/HeaderButton';
import {t} from '~frontend/drivers/localization';
import {IconNames} from '~frontend/global-styles/icons';

/**
 * In pixels.
 */
const HEIGHT = Dimensions.avatarSizeNormal;

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 0,
    flex: 0,
    height: HEIGHT,
    minHeight: HEIGHT,
  },

  authorAvatar: {
    marginRight: Dimensions.horizontalSpaceSmall,
  },

  authorNameTouchable: {
    flex: 1,
  },

  authorNameSection: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  authorName: {
    fontSize: Typography.fontSizeNormal,
    fontWeight: 'bold',
    fontFamily: Typography.fontFamilyReadableText,
    color: Palette.text,
  },
});

export interface Props {
  msg: MsgAndExtras;
  style?: ViewStyle;
  name?: string;
  imageUrl: string | null;
  unread?: boolean;
  onPressAuthor?: (ev: {authorFeedId: FeedId}) => void;
  onPressTimestamp?: (timestamp: number) => void;
  onPressEtc?: (msg: Msg) => void;
}

export default class MessageHeader extends Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  /**
   * in pixels
   */
  public static HEIGHT = HEIGHT;

  private _onPressAuthor = () => {
    this.props.onPressAuthor?.({authorFeedId: this.props.msg.value.author});
  };

  private _onPressTimestamp = () => {
    this.props.onPressTimestamp?.(this.props.msg.value.timestamp);
  };

  public shouldComponentUpdate(nextProps: Props) {
    const prevProps = this.props;
    return (
      nextProps.msg.key !== prevProps.msg.key ||
      nextProps.name !== prevProps.name ||
      nextProps.imageUrl !== prevProps.imageUrl
    );
  }

  private _renderAuthorName(
    name: string | undefined,
    id: FeedId,
    timestamp: number,
    unread: boolean | undefined,
  ) {
    return h(View, {key: 'c', style: styles.authorNameSection}, [
      h(
        TouchableOpacity,
        {
          onPress: this._onPressAuthor,
          activeOpacity: 0.4,
          key: 'c1',
          style: styles.authorNameTouchable,
        },
        [
          h(
            Text,
            {
              numberOfLines: 1,
              ellipsizeMode: 'middle',
              style: styles.authorName,
            },
            displayName(name, id),
          ),
        ],
      ),

      h(
        TouchableOpacity,
        {
          onPress: this._onPressTimestamp,
          activeOpacity: 0.4,
          key: 'c2',
          style: styles.authorNameTouchable,
        },
        [h(TimeAgo, {timestamp, unread: unread ?? false})],
      ),
    ]);
  }

  private _onPressEtc = () => {
    this.props.onPressEtc?.(this.props.msg);
  };

  public render() {
    const {msg, name, imageUrl} = this.props;
    const unread = this.props.unread;
    const authorTouchableProps = {
      onPress: this._onPressAuthor,
      activeOpacity: 0.4,
    };

    return h(View, {style: [styles.container, this.props.style]}, [
      h(TouchableOpacity, {...authorTouchableProps, key: 'a'}, [
        h(Avatar, {
          size: Dimensions.avatarSizeNormal,
          url: imageUrl,
          style: styles.authorAvatar,
        }),
      ]),
      this._renderAuthorName(
        name,
        msg.value.author,
        msg.value.timestamp,
        unread,
      ),
      h(HeaderButton, {
        key: 'etc',
        onPress: this._onPressEtc,
        icon: IconNames.etcDropdown,
        accessibilityLabel: t('message.call_to_action.etc.accessibility_label'),
        side: 'neutral',
        color: Palette.textWeak,
      }),
    ]);
  }
}
