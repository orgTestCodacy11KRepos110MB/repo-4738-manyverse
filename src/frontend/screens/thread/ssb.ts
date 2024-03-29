// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {
  toVoteContent,
  toReplyPostContent,
  toGatheringAttendContent,
} from '~frontend/ssb/utils/to-ssb';
import {Req, contentToPublishReq} from '~frontend/drivers/ssb';
import {PressAddReactionEvent} from '~frontend/ssb/types';
import {State} from './model';

export interface SSBActions {
  addReactionMsg$: Stream<PressAddReactionEvent>;
  attendGathering$: Stream<{
    isAttending: boolean;
    attendeeId: string;
    gatheringId: string;
  }>;
  publishMsg$: Stream<State>;
}

/**
 * Define streams of new content to be flushed onto SSB.
 */
export default function ssb(actions: SSBActions): Stream<Req> {
  const addReaction$ = actions.addReactionMsg$.map(toVoteContent);

  const attendGathering$ = actions.attendGathering$.map(
    ({isAttending, attendeeId, gatheringId}) =>
      toGatheringAttendContent(gatheringId, attendeeId, isAttending),
  );

  const publishReply$ = actions.publishMsg$.map((state) => {
    const messages = state.thread.messages;
    return toReplyPostContent({
      text: state.replyText,
      root: state.rootMsgId,
      fork: state.higherRootMsgId,
      branch: messages[messages.length - 1].key,
    });
  });

  return xs
    .merge(addReaction$, publishReply$, attendGathering$)
    .map(contentToPublishReq);
}
