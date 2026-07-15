import { OfficeState, Whiteboard } from '../../schema/OfficeState'
import {
  WhiteboardAddUserCommand,
  WhiteboardRemoveUserCommand,
} from '../WhiteboardUpdateArrayCommand'
import { makeCommand, fakeClient } from './testHelpers'

describe('WhiteboardAddUserCommand', () => {
  it('adds the client to the whiteboard connectedUser set', () => {
    const state = new OfficeState()
    state.whiteboards.set('main-0', new Whiteboard())

    makeCommand(WhiteboardAddUserCommand, state).execute({
      client: fakeClient('session-1'),
      whiteboardId: 'main-0',
    })

    expect(state.whiteboards.get('main-0')!.connectedUser.has('session-1')).toBe(true)
  })

  it('does not throw and is a no-op for an unknown whiteboardId', () => {
    const state = new OfficeState()

    expect(() =>
      makeCommand(WhiteboardAddUserCommand, state).execute({
        client: fakeClient('session-1'),
        whiteboardId: 'does-not-exist',
      })
    ).not.toThrow()
  })
})

describe('WhiteboardRemoveUserCommand', () => {
  it('removes the client from the whiteboard connectedUser set', () => {
    const state = new OfficeState()
    const whiteboard = new Whiteboard()
    whiteboard.connectedUser.add('session-1')
    state.whiteboards.set('main-0', whiteboard)

    makeCommand(WhiteboardRemoveUserCommand, state).execute({
      client: fakeClient('session-1'),
      whiteboardId: 'main-0',
    })

    expect(state.whiteboards.get('main-0')!.connectedUser.has('session-1')).toBe(false)
  })

  // regression test for the same crash-class bug as ComputerRemoveUserCommand
  it('does not throw for an unknown whiteboardId', () => {
    const state = new OfficeState()

    expect(() =>
      makeCommand(WhiteboardRemoveUserCommand, state).execute({
        client: fakeClient('session-1'),
        whiteboardId: 'does-not-exist',
      })
    ).not.toThrow()
  })
})
