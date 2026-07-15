import { OfficeState, Player } from '../../schema/OfficeState'
import PlayerUpdateNameCommand from '../PlayerUpdateNameCommand'
import { makeCommand, fakeClient } from './testHelpers'

describe('PlayerUpdateNameCommand', () => {
  it('sets the player name', () => {
    const state = new OfficeState()
    state.players.set('session-1', new Player())

    makeCommand(PlayerUpdateNameCommand, state).execute({
      client: fakeClient('session-1'),
      name: 'Wira',
    })

    expect(state.players.get('session-1')!.name).toBe('Wira')
  })

  it('truncates names longer than the max length', () => {
    const state = new OfficeState()
    state.players.set('session-1', new Player())

    makeCommand(PlayerUpdateNameCommand, state).execute({
      client: fakeClient('session-1'),
      name: 'a'.repeat(50),
    })

    expect(state.players.get('session-1')!.name.length).toBe(16)
  })

  it('does not throw if the player is missing from state', () => {
    const state = new OfficeState()

    expect(() =>
      makeCommand(PlayerUpdateNameCommand, state).execute({
        client: fakeClient('session-1'),
        name: 'Wira',
      })
    ).not.toThrow()
  })
})
