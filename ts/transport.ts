namespace BlueChat {

  export abstract class TransportBase implements ITransport {
    private _listeners: {
      [K in keyof TransportEventMap]?: Array<(data: TransportEventMap[K]) => void>;
    } = {};

    on<K extends keyof TransportEventMap>(
      event: K,
      fn: (data: TransportEventMap[K]) => void
    ): void {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event]!.push(fn);
    }

    off<K extends keyof TransportEventMap>(
      event: K,
      fn: (data: TransportEventMap[K]) => void
    ): void {
      const fns = this._listeners[event];
      if (!fns) return;
      this._listeners[event] = fns.filter(f => f !== fn) as typeof fns;
    }

    protected emit<K extends keyof TransportEventMap>(
      event: K,
      ...args: TransportEventMap[K] extends void ? [] : [TransportEventMap[K]]
    ): void {
      const fns = this._listeners[event];
      if (!fns) return;
      for (const fn of fns) {
        (fn as (data?: unknown) => void)(args[0]);
      }
    }

    abstract createInvite(): Promise<string>;
    abstract acceptInvite(inviteData: string): Promise<string>;
    abstract completeHandshake(responseData: string): Promise<void>;
    abstract send(message: string): void;
    abstract disconnect(): void;
  }
}
