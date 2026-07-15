import { Command } from '@colyseus/command'
import { Client } from 'colyseus'
import { OfficeState } from '../../schema/OfficeState'

// builds a command with .room/.state wired to a real OfficeState instance,
// without needing an actual running Colyseus Room/Dispatcher
export function makeCommand<T extends Command<OfficeState, any>>(
  CommandClass: new () => T,
  state: OfficeState
): T {
  const command = new CommandClass()
  command.state = state
  command.room = { state } as any
  return command
}

export function fakeClient(sessionId: string): Client {
  return { sessionId } as Client
}
