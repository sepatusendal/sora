import { OfficeState, Player } from '../../schema/OfficeState'
import ChatMessageUpdateCommand, { MAX_CHAT_MESSAGE_LENGTH } from '../ChatMessageUpdateCommand'
import { makeCommand, fakeClient } from './testHelpers'

describe('ChatMessageUpdateCommand', () => {
  it('appends a chat message authored by the sending player', () => {
    const state = new OfficeState()
    const player = new Player()
    player.name = 'Wira'
    state.players.set('session-1', player)

    makeCommand(ChatMessageUpdateCommand, state).execute({
      client: fakeClient('session-1'),
      content: 'hello',
    })

    expect(state.chatMessages.length).toBe(1)
    expect(state.chatMessages[0].author).toBe('Wira')
    expect(state.chatMessages[0].content).toBe('hello')
  })

  it('truncates content longer than MAX_CHAT_MESSAGE_LENGTH', () => {
    const state = new OfficeState()
    state.players.set('session-1', new Player())
    const longContent = 'x'.repeat(MAX_CHAT_MESSAGE_LENGTH + 100)

    makeCommand(ChatMessageUpdateCommand, state).execute({
      client: fakeClient('session-1'),
      content: longContent,
    })

    expect(state.chatMessages[0].content.length).toBe(MAX_CHAT_MESSAGE_LENGTH)
  })

  it('caps the message array at 100 by dropping the oldest', () => {
    const state = new OfficeState()
    state.players.set('session-1', new Player())
    const command = makeCommand(ChatMessageUpdateCommand, state)

    for (let i = 0; i < 105; i++) {
      command.execute({ client: fakeClient('session-1'), content: `message-${i}` })
    }

    expect(state.chatMessages.length).toBe(100)
    // the oldest 5 should have been dropped, so the first remaining is message-5
    expect(state.chatMessages[0].content).toBe('message-5')
  })

  // regression test: if the sending player already left the room in the
  // same tick a chat command is in-flight, this used to throw on
  // `player.name` being read off `undefined`
  it('does not throw if the sending player is missing from state', () => {
    const state = new OfficeState()

    expect(() =>
      makeCommand(ChatMessageUpdateCommand, state).execute({
        client: fakeClient('session-1'),
        content: 'hello',
      })
    ).not.toThrow()
    expect(state.chatMessages.length).toBe(0)
  })
})
