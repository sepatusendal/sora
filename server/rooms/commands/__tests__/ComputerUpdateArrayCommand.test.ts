import { OfficeState, Computer } from '../../schema/OfficeState'
import { ComputerAddUserCommand, ComputerRemoveUserCommand } from '../ComputerUpdateArrayCommand'
import { makeCommand, fakeClient } from './testHelpers'

describe('ComputerAddUserCommand', () => {
  it('adds the client to the computer connectedUser set', () => {
    const state = new OfficeState()
    state.computers.set('main-0', new Computer())

    makeCommand(ComputerAddUserCommand, state).execute({
      client: fakeClient('session-1'),
      computerId: 'main-0',
    })

    expect(state.computers.get('main-0')!.connectedUser.has('session-1')).toBe(true)
  })

  it('does not throw and is a no-op for an unknown computerId', () => {
    const state = new OfficeState()

    expect(() =>
      makeCommand(ComputerAddUserCommand, state).execute({
        client: fakeClient('session-1'),
        computerId: 'does-not-exist',
      })
    ).not.toThrow()
  })

  it('does not double-add the same client', () => {
    const state = new OfficeState()
    state.computers.set('main-0', new Computer())

    const command = makeCommand(ComputerAddUserCommand, state)
    command.execute({ client: fakeClient('session-1'), computerId: 'main-0' })
    command.execute({ client: fakeClient('session-1'), computerId: 'main-0' })

    expect(state.computers.get('main-0')!.connectedUser.size).toBe(1)
  })
})

describe('ComputerRemoveUserCommand', () => {
  it('removes the client from the computer connectedUser set', () => {
    const state = new OfficeState()
    const computer = new Computer()
    computer.connectedUser.add('session-1')
    state.computers.set('main-0', computer)

    makeCommand(ComputerRemoveUserCommand, state).execute({
      client: fakeClient('session-1'),
      computerId: 'main-0',
    })

    expect(state.computers.get('main-0')!.connectedUser.has('session-1')).toBe(false)
  })

  // regression test for a real crash bug: this handler used to dereference
  // `computer.connectedUser` without checking `computer` existed first,
  // which crashed the whole room process for every player in it whenever a
  // client sent a computerId that wasn't in state (see HANDOFF.md / audit)
  it('does not throw for an unknown computerId', () => {
    const state = new OfficeState()

    expect(() =>
      makeCommand(ComputerRemoveUserCommand, state).execute({
        client: fakeClient('session-1'),
        computerId: 'does-not-exist',
      })
    ).not.toThrow()
  })
})
