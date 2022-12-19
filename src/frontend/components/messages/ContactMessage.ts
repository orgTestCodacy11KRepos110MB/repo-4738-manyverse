// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import {Component} from 'react';
import {StyleSheet} from 'react-native';
import {h} from '@cycle/react';
import {ContactContent as Contact, FeedId, Msg} from 'ssb-typescript';
import {Dimensions} from '~frontend/global-styles/dimens';
import {
  Reactions,
  PressReactionsEvent,
  PressAddReactionEvent,
  MsgAndExtras,
} from '~frontend/ssb/types';
import MessageContainer from './MessageContainer';
import MessageHeader from './MessageHeader';
import ContactBody from './ContactBody';
import MessageFooter from './MessageFooter';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flex: 1,
  },

  footer: {
    flex: 0,
    height: MessageFooter.HEIGHT,
    minHeight: MessageFooter.HEIGHT,
    marginBottom: -Dimensions.verticalSpaceBig,
  },
});

export interface Props {
  msg: MsgAndExtras<Contact>;
  name?: string;
  contactName?: string;
  imageUrl: string | null;
  lastSessionTimestamp: number;
  preferredReactions: Array<string>;
  reactions: Reactions;
  replyCount: number;
  selfFeedId: FeedId;
  onPressReactions?: (ev: PressReactionsEvent) => void;
  onPressAddReaction?: (ev: PressAddReactionEvent) => void;
  onPressReply?: () => void;
  onPressAuthor?: (ev: {authorFeedId: FeedId}) => void;
  onPressTimestamp?: (timestamp: number) => void;
  onPressEtc?: (msg: Msg) => void;
}

export default class ContactMessage extends Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  public shouldComponentUpdate(nextProps: Props) {
    const prevProps = this.props;
    return nextProps.msg.key !== prevProps.msg.key;
  }

  public render() {
    const props = this.props;
    const unread = props.msg.timestamp > props.lastSessionTimestamp;

    return h(MessageContainer, {}, [
      h(MessageHeader, {...props, unread}),
      h(ContactBody, props),
      h(MessageFooter, {...props, style: styles.footer}),
    ]);
  }
}
