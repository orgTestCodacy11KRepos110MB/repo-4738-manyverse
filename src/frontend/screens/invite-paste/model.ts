// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {Reducer} from '@cycle/state';

export interface State {
  content: string;
}

export interface Actions {
  updateContent$: Stream<string>;
}

export default function model(actions: Actions): Stream<Reducer<State>> {
  const initReducer$ = xs.of(function initReducer(prev?: State): State {
    if (prev) return prev;
    return {content: ''};
  });

  const updatePostTextReducer$ = actions.updateContent$.map(
    (text) =>
      function updatePostTextReducer(prev?: State): State {
        return {content: text};
      },
  );

  return xs.merge(initReducer$, updatePostTextReducer$);
}
