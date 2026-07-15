import { OfficeState, Player } from '../../schema/OfficeState'
import PlayerUpdateCommand from '../PlayerUpdateCommand'
import { makeCommand, fakeClient } from './testHelpers'

describe('PlayerUpdateCommand', () => {
  it('updates position and animation', () => {
    const state = new OfficeState()
    state.players.set('session-1', new Player())

    makeCommand(PlayerUpdateCommand, state).execute({
      client: fakeClient('session-1'),
      x: 123,
      y: 456,
      anim: 'adam_run_down',
    })

    const player = state.players.get('session-1')!
    expect(player.x).toBe(123)
    expect(player.y).toBe(456)
    expect(player.anim).toBe('adam_run_down')
  })

  it('does not throw if the player is missing from state', () => {
    const state = new OfficeState()

    expect(() =>
      makeCommand(PlayerUpdateCommand, state).execute({
        client: fakeClient('session-1'),
        x: 0,
        y: 0,
        anim: 'adam_idle_down',
      })
    ).not.toThrow()
  })
})
