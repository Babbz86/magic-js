import { Extension } from '@magic-sdk/commons';
import type { CreateChannelAPIResponse, AuthenticateAPIResponse, AuthClientError } from '@farcaster/auth-client';
import { FarcasterPayloadMethod } from './types';
import { isMobile } from './utils';

const DEFAULT_SHOW_UI = true;

type LoginParams = {
  showUI: boolean;
};

const FarcasterLoginEventOnReceived = {
  OpenChannel: 'channel',
  Success: 'success',
  Failed: 'failed',
} as const;

type FarcasterLoginEventHandlers = {
  [FarcasterLoginEventOnReceived.OpenChannel]: (channel: CreateChannelAPIResponse) => void;
  [FarcasterLoginEventOnReceived.Success]: (data: AuthenticateAPIResponse) => void;
  [FarcasterLoginEventOnReceived.Failed]: (error: AuthClientError) => void;
};

export class FarcasterExtension extends Extension.Internal<'farcaster'> {
  name = 'farcaster' as const;
  config = {};
  channel: CreateChannelAPIResponse | null = null;

  constructor() {
    super();

    (async () => {
      const json = await fetch(`https://relay.farcaster.xyz/v1/channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: location.host,
          siweUri: location.origin,
        }),
      }).then<CreateChannelAPIResponse>((r) => r.json());

      this.channel = json;
    })();
  }

  public login = (params?: LoginParams) => {
    if (!this.channel) {
      console.info('Channel not created yet. Please wait for the channel to be created.');
      return;
    }

    const showUI = params?.showUI ?? DEFAULT_SHOW_UI;

    const domain = location.origin;

    const payload = this.utils.createJsonRpcRequestPayload(FarcasterPayloadMethod.FarcasterShowQR, [
      {
        data: {
          showUI,
          domain,
          isMobile: isMobile(),
          channel: this.channel,
        },
      },
    ]);

    const handle = this.request<string, FarcasterLoginEventHandlers>(payload);

    if (isMobile()) {
      location.href = this.channel.url;
    }

    return handle;
  };
}
